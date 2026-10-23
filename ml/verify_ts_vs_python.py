# ============================================================
# TS vs Python Verification - 5 samples par dono model compare
# ------------------------------------------------------------
# Python: landslide_model_v3.pkl (GradientBoosting, asli model)
# TS    : src/ml/riskModelV3.ts (distilled, node se chalakar)
# Shart : dono ke LEVEL 5/5 samples par match karne chahiye.
# Chalana: python3 verify_ts_vs_python.py
# ============================================================
import json
import subprocess

import joblib
import pandas as pd

HERE = __file__.rsplit("/", 1)[0]
FEATURES = ["rainfall", "soil_moisture", "slope",
            "historical_risk", "three_day_rainfall", "antecedent_30d"]
SAMPLES = {
    "dry_low": (5, 30, 12, 1, 10, 80),
    "moderate": (45, 55, 25, 2, 110, 450),
    "high": (95, 75, 33, 3, 240, 850),
    "nh10_critical": (142, 87, 34, 4, 315, 1405),
    "cherrapunji_extreme": (188, 91, 38, 4, 393, 1525),
}


def lvl(s):
    return "Critical" if s >= 80 else "High" if s >= 65 else "Moderate" if s >= 40 else "Low"


model = joblib.load(HERE + "/landslide_model_v3.pkl")
ts_out = subprocess.run(["node", HERE + "/verify_samples.ts"],
                        capture_output=True, text=True, cwd=HERE)
ts = json.loads(ts_out.stdout.strip().splitlines()[-1])
print("modelMeta (TS se):", ts["meta"])
print(f"\n{'Sample':22s} {'Python':>14s} {'TS':>14s}  Match?")
print("-" * 60)
all_match = True
for name, vals in SAMPLES.items():
    py = float(model.predict(pd.DataFrame([vals], columns=FEATURES))[0])
    py = max(0.0, min(100.0, py))
    t = ts["results"][name]
    match = lvl(py) == t["level"]
    all_match = all_match and match
    print(f"{name:22s} {py:6.1f} {lvl(py):7s} {t['score']:6.1f} {t['level']:7s}  {'YES' if match else 'NO'}")
print("-" * 60)
print("ALL LEVELS MATCH:", all_match)
