# NE-SHIELD V4 — Landslide Early Warning Dashboard

Clean, professional rebuild. Frontend-only React + Vite + TypeScript app (deploys as a static site, e.g. Vercel). All training data comes from **one pipeline: the Open-Meteo Archive API** — no old datasets, no ISRO files, no synthetic rows, no mock risk scores.

## Run

```bash
npm install
npm run dev        # local dev
npm run build      # production build (tsc + vite) → dist/
npm run preview    # serve the production build
```

## How it works

- **20 zones** (`src/data/locations.ts`): name, state, lat/lng, slope (terrain attribute).
- **Live risk:** `src/services/weather.ts` fetches the Open-Meteo forecast API per zone (last 31 days), computes rainfall 24h / 3-day / 30-day and soil moisture, and `src/ml/model.ts` (`predictRisk`) scores it. Every number shows its provenance ("Open-Meteo • fetched HH:MM"); if the API fails, the UI says so and shows no invented numbers.
- **API status:** the top bar checks the Open-Meteo forecast + archive endpoints live on every page (latency, last-checked time, source links).
- **Tabs:** Home (landing page for visitors, partners and investors) · Overview (stats, top-risk list, all-zones table, zone detail drawer) · Live Map (Leaflet, Esri satellite imagery + reference overlays) · Accuracy (model card + backtest) · Report Hazard (demo form, saves to browser localStorage only).

## Data & model pipeline (`ml/`)

```bash
cd ml
python3 fetch_data.py   # Archive API 2018–2022 (May 2–Sep 30 windows) → dataset_features.csv (raw JSON cached in ml/raw/)
python3 train.py        # labels via ONE transparent formula (see header) → dataset.csv, metrics.json, model.pkl
python3 backtest.py     # 7 documented landslide events + 7 dry-season controls → backtest_results.csv, src/data/backtest.ts
```

- Dataset: **1,740 weekly rows** (20 zones × monsoon weeks, Jun–Sep 2018–2022), all weather from Open-Meteo Archive (ERA5). Features: `rainfall, rainfall_3d, rainfall_30d, soil_moisture, slope`.
- Training: temporal split — **train ≤2020 (1,060 rows), test 2021–2022 (680 rows)**. Best model GradientBoosting: **MAE 0.73, R² 0.9900, level accuracy 97.5%** (see `ml/metrics.json` / Accuracy tab).
- Labels are **formula-derived from real weather** (documented in `ml/train.py`), not recorded landslide outcomes — the honest real-world test is the backtest: **57.1% (8/14)** — 1/7 events hit, 7/7 controls correctly rejected, zero false alarms. Misses are explained in the Accuracy tab's honesty note.

## Design

Muted professional palette (bg `#0B1220`, surface `#101A2E`, one accent `#3B82F6`; risk colors only as small dots/badges), Plus Jakarta Sans, fixed type scale (12/13/14/16/20/28px). No gradients.
