// GENERATED from ml/metrics.json by the V4 ML pipeline (ml/train.py run,
// values copied verbatim) — regenerate after re-training; do not hand-edit
// numbers. This is the copy the Accuracy UI reads. src/ml/model.ts exports
// the same object for the model code.
export const MODEL_INFO = {
  version: 'V4',
  bestModel: 'GradientBoosting',
  mae: 0.73,
  r2: 0.99,
  levelAccuracy: 97.5,
  trainRows: 1060,
  testRows: 680,
  trainedOn: 'Open-Meteo Archive 2018-2022 monsoon (Jun-Sep), train ≤2020',
  featureImportance: {
    rainfall: 27.1,
    rainfall_3d: 52.2,
    rainfall_30d: 19.6,
    soil_moisture: 0.1,
    slope: 1.0,
  } as Record<string, number>,
};
