// Honest wet-day model (Oct 30, 2026) — hand-maintained. Values verified from
// workspace/ne_shield_v4/labeled_data/train_60_40.py and train_wetday_final.py.
// This is the copy the Accuracy UI reads. History: V4 GradientBoosting
// (97.5% formula-fidelity, 57.1% honest backtest) in src/data/backtest.ts;
// January-control RandomForest (97.1%, soft — monsoon-vs-winter) in git history.
export const MODEL_INFO = {
  version: 'V5 wet-day (honest test)',
  bestModel: 'RandomForest (200 trees)',
  levelAccuracy: 68.3,
  trainRows: 939,
  testRows: 624,
  trainedOn: 'Open-Meteo Archive (ERA5) 2007–2022 — sirf geele din: 521 asli landslides + 1,042 wet-day non-events (January controls: zero)',
  featureImportance: {
    '24h rainfall': 24.1,
    '3-day rainfall': 23.8,
    '30-day rainfall': 23.2,
    'slope (DEM)': 17.6,
    'soil moisture': 11.2,
  } as Record<string, number>,
};
