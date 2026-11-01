# NE-SHIELD Model Card — Wet-Day Landslide Risk Model

> **What this card covers:** the trained RandomForest model whose evaluation is
> quoted on the site ("68.3% on unseen rainy days"). **Critical scope note:** the
> live site does NOT run this model — it runs the deterministic **V4 formula**
> (`src/ml/model.ts`), which is the same equation the model was trained to
> approximate. The formula's own honest backtest is **57.1% on 14 documented
> real cases** (`src/data/backtest.ts`). See "What runs live" below.

## Identity

| Field | Value |
|---|---|
| Model | RandomForestClassifier, 200 trees, `random_state=42` (sklearn) |
| Version label | "V5 wet-day (honest test)" — internal only, not user-facing |
| Train script | `labeled_data/train_wetday_final.py` |
| Eval script | `labeled_data/train_60_40.py` |
| Artifact | `labeled_data/wetday_final_model.joblib` |
| UI copy source | `src/data/modelInfo.ts` (hand-maintained from the scripts) |

## Training data (verified from the scripts)

- **1,563 rows total:** 521 real landslide incidents (NASA GLC/COOLR 2007–2018 +
  6 verified 2021–2022 news events, same set as the site's historical inventory)
  plus **1,042 hard negatives** — wet monsoon non-events: days at/near real
  incident locations and times when it rained but **no landslide was recorded**.
- **January (dry-season) controls are excluded entirely** — zero rows. Earlier
  work used January days as easy negatives and inflated the score (see
  "The 97.1% story" below).
- Weather features from **Open-Meteo Archive (ERA5)**, timezone Asia/Kolkata.
  Slope from **AWS Terrarium DEM** per zone.
- Features: `rainfall_24h_mm`, `rainfall_3d_mm`, `rainfall_30d_mm`,
  `soil_moisture_pct` (ERA5 `soil_moisture_0_to_7cm`, converted
  `min(raw / 0.45 * 100, 100)`), `slope_deg`.

## Method

Grouped 60/40 time-split: incidents + their paired negatives are grouped (no
row from one incident leaks across the split), groups ordered by incident date,
oldest 60% → train (939 rows), newest 40% → test (624 rows, never seen in
training). The test set is the most recent 40% of incidents — the closest
proxy to "what would happen tomorrow".

## Evaluation (WITH scope)

- **68.3% accuracy (426/624)** — train AND test on wet monsoon days only.
  - Events caught: **60/208** (28.8% recall on real landslides)
  - False alarms: **50/416** (12.0% on wet non-event days)
  - Misses are shown openly; the number is small because the task is hard,
    not because the test was easy.

## Feature importance (from the final fit)

| Feature | Importance |
|---|---|
| 24h rainfall | 24.1% |
| 3-day rainfall | 23.8% |
| 30-day rainfall | 23.2% |
| Slope (DEM) | 17.6% |
| Soil moisture | 11.2% |

Key finding: 4 weather features alone cannot separate a wet day *with* a
landslide from a wet day *without* one. Exact slope (DEM) + geology are the
missing discriminators — this is why recall is 28.8% and why the number must
never be presented as a safety guarantee.

## The 97.1% story (WITH scope — never present bare)

An earlier RandomForest (Oct 27) scored **97.1% on 1,042 rows: 521 real
landslides + 521 January (dry) controls**. The test was monsoon-vs-winter —
weather alone separates those trivially. The same model false-alarmed **97.9%**
on real wet monsoon non-event days. The number measured the test's easiness,
not the model's skill. **Rule: 97.1% may only appear with the words
"soft — monsoon-vs-winter, January controls".**

## The 97.5% / 57.1% story (WITH scope)

The V4 GradientBoosting model reached **97.5% "formula fidelity"** — it learned
to reproduce the hand-written V4 formula's labels, not to predict real
landslides. Its honest backtest on **14 documented real cases (7 events + 7
controls, with news-source URLs)** in `src/data/backtest.ts` is **57.1%**.
97.5% is a fidelity score, never an accuracy claim.

## What runs live (honesty note)

The live site computes risk with the **V4 formula** in `src/ml/model.ts`
(deterministic weighted score + ISRO-coefficient probability boost), **not**
with the trained RandomForest. The trained model's role is evidential: it is
the proof that an honestly-trained ML model on this data tops out at 68.3%,
which is why the site scores transparently with the formula instead of
pretending a model is in production.

## Limitations

- Soil moisture is an **ERA5 model estimate**, not a sensor reading; live
  scoring uses forecast `soil_moisture_0_to_1cm` while training used archive
  `soil_moisture_0_to_7cm` (same conversion, different depth — a known drift).
- Rainfall is Open-Meteo's gridded estimate, not gauge data; micro-catchment
  cloudbursts can be missed.
- No geology, drainage, or human-activity features. Scores are decision
  support, never an official warning.
- Per the user's standing order: **no Model Accuracy / Technical Evaluation
  pages on the live site.** The operator hears the 68.3% story in the
  report/viva; this card is the written record.

## Reproduce

```bash
cd ~/workspace/ne_shield_v4/labeled_data && ~/mlenv/bin/python train_60_40.py
```
Expected output: `ACCURACY: 68.3% (426/624)`, `Events caught: 60/208`, `False alarms: 50/416`.
