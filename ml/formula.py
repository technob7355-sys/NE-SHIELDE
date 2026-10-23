"""NE-SHIELD V4 — the ONE label formula (single source of truth, Python side).

Implemented identically in:
  - ml/formula.py        (this file — used by train.py and backtest.py)
  - src/ml/model.ts      (distilled TypeScript mirror used by the live UI)

FORMULA
-------
Normalized components, each 0..1:
    rain24n = min(rainfall    / 150,  1)
    rain3dn = min(rainfall_3d / 350,  1)
    rain30dn= min(rainfall_30d/ 1200, 1)
    soiln   = soil_moisture / 100
    slopen  = min(slope / 45, 1)

Weighted base score (0..100):
    base = 100 * (0.30*rain24n + 0.25*rain3dn + 0.20*rain30dn
                  + 0.15*soiln + 0.10*slopen)

ISRO-style logistic probability boost:
    z = -3.817 + 0.0077*rainfall + 0.0058*rainfall_3d + 0.0009*rainfall_30d
    P = 1 / (1 + exp(-z))
    HONESTY NOTE: the published ISRO coefficients (0.077 / 0.058 / 0.009) were
    fitted on *daily* rain inputs. Applied raw to our cumulative 3-day and
    30-day sums they saturate P at ~1.0 for almost any wet week, which would
    make the boost meaningless. We therefore apply a uniform 0.1 scale to all
    three coefficients (0.0077 / 0.0058 / 0.0009). The intercept (-3.817) is
    kept as published.

Final score:
    score = round(0.8 * base + 20 * P), capped to 0..100

Levels:
    >= 80 Critical | >= 65 High | >= 40 Moderate | else Low

IMPORTANT: these labels are FORMULA-DERIVED from real ERA5 weather — they are
a transparent, reproducible heuristic, not observed landslide outcomes. Model
metrics in ml/metrics.json therefore measure how well the ML regressors
reproduce this formula on unseen years, not real-world predictive skill.
Real-world skill is measured separately by ml/backtest.py against documented
historical landslide events.
"""

import math

# Component point maxima in the UI breakdown (sum = 100):
#   Rainfall 24h 24 | Rainfall 3-day 20 | Rainfall 30-day 16
#   Soil moisture 12 | Slope 8 | ISRO probability boost 20


def risk_components(rainfall, rainfall_3d, rainfall_30d, soil_moisture, slope):
    """Return (score:int, level:str, breakdown:list[(label, points, max)])."""
    rain24n = min(rainfall / 150.0, 1.0)
    rain3dn = min(rainfall_3d / 350.0, 1.0)
    rain30dn = min(rainfall_30d / 1200.0, 1.0)
    soiln = soil_moisture / 100.0
    slopen = min(slope / 45.0, 1.0)

    base = 100.0 * (0.30 * rain24n + 0.25 * rain3dn + 0.20 * rain30dn
                    + 0.15 * soiln + 0.10 * slopen)

    z = -3.817 + 0.0077 * rainfall + 0.0058 * rainfall_3d + 0.0009 * rainfall_30d
    p = 1.0 / (1.0 + math.exp(-z))

    breakdown = [
        ("Rainfall 24h", 0.8 * 100.0 * 0.30 * rain24n, 24),
        ("Rainfall 3-day", 0.8 * 100.0 * 0.25 * rain3dn, 20),
        ("Rainfall 30-day", 0.8 * 100.0 * 0.20 * rain30dn, 16),
        ("Soil moisture", 0.8 * 100.0 * 0.15 * soiln, 12),
        ("Slope", 0.8 * 100.0 * 0.10 * slopen, 8),
        ("ISRO probability boost", 20.0 * p, 20),
    ]
    total = sum(pt for _, pt, _ in breakdown)
    # total == 0.8*base + 20*P by construction
    assert abs(total - (0.8 * base + 20.0 * p)) < 1e-9
    score = max(0, min(100, round(total)))
    return score, level_of(score), breakdown


def risk_score(rainfall, rainfall_3d, rainfall_30d, soil_moisture, slope):
    return risk_components(rainfall, rainfall_3d, rainfall_30d,
                           soil_moisture, slope)[0]


def level_of(score):
    if score >= 80:
        return "Critical"
    if score >= 65:
        return "High"
    if score >= 40:
        return "Moderate"
    return "Low"
