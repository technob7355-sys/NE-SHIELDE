// Demo baseline model (Oct 27, 2026) — hand-maintained. Values verified from
// workspace/ne_shield_v4/labeled_data/ne_landslide_labeled.csv and
// train_demo.py. This is the copy the Accuracy UI reads. The old V4
// GradientBoosting numbers (97.5% formula-fidelity, 57.1% honest backtest)
// are kept as history in src/data/backtest.ts and the Accuracy page.
export const MODEL_INFO = {
  version: 'V4 demo (real events)',
  bestModel: 'RandomForest (200 trees)',
  levelAccuracy: 97.1,
  trainRows: 762,
  testRows: 280,
  trainedOn: 'Open-Meteo Archive (ERA5) 2007–2022, train ≤2015 (asli landslide records)',
  featureImportance: {
    '30-day rainfall': 45.8,
    '3-day rainfall': 29.8,
    '24h rainfall': 19.8,
    'soil moisture': 4.6,
  } as Record<string, number>,
};
