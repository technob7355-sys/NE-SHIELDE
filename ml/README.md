# NE-SHIELD V4 — Data + ML Pipeline

One clean pipeline. **API data only** (Open-Meteo Archive, ERA5) — no ISRO
files, no synthetic rows, no old datasets. The 20 zone definitions (name /
state / lat / lng / slope) live in `../src/data/locations.ts` and are mirrored
in `fetch_data.py`.

## Steps

| Step | Script | Output |
|---|---|---|
| 1. Fetch | `fetch_data.py` | `raw/*.json` cache, `dataset_features.csv` |
| 2. Label + train | `train.py` | `dataset.csv` (features + `risk_score`/`risk_level`), `model.pkl`, `metrics.json` |
| 3. Backtest | `backtest.py` | `backtest_results.csv`, `../src/data/backtest.ts` |

## How to re-run

```bash
cd ml
python3 fetch_data.py   # ~3 min first time; raw JSON cached in ml/raw/
python3 train.py        # rewrites dataset.csv with labels; prints both models
python3 backtest.py     # 14 archive fetches (cached in ml/raw/backtest/)
```

After re-training, copy the new values from `metrics.json` into
`MODEL_INFO` in both `../src/ml/model.ts` and `../src/data/modelInfo.ts`
(the latter carries a "generated from ml/metrics.json" note).

## Method notes (honesty)

- **Fetch window:** per zone-year we fetch **May 2 – Sep 30** and emit only
  weeks ending Sunday inside Jun 1 – Sep 30, so `rainfall_30d` is complete
  even for early-June weeks.
- **Weekly features:** `rainfall` = rain on the week's last day;
  `rainfall_3d` / `rainfall_30d` = trailing 3 / 30-day sums ending that day;
  `soil_moisture` = week's average ERA5 `soil_moisture_0_to_7cm`, converted
  `min(raw / 0.45 * 100, 100)` % (0.45 m³/m³ treated as saturation).
- **Labels are formula-derived**, not observed landslides — see the full
  formula + ISRO-coefficient scaling note in `formula.py` / `train.py`
  headers. Training metrics therefore measure how well the ML regressors
  reproduce the formula on unseen years (temporal split: train ≤ 2020,
  test 2021–2022), **not** real-world skill.
- **Real-world skill** is measured by `backtest.py`: 7 documented events +
  7 January controls, scored with the *same formula the UI uses*
  (`formula.py` ≡ `src/ml/model.ts`, verified identical on sample inputs).
- **Live weather** (`../src/services/weather.ts`) uses the forecast API,
  whose soil variable is `soil_moisture_0_to_1cm` (archive used 0–7 cm);
  the same /0.45 conversion is applied.
