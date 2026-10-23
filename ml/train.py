#!/usr/bin/env python3
"""NE-SHIELD V4 — step 2: label the dataset and train the ML regressors.

LABEL FORMULA — THE ONE METHOD (implemented in ml/formula.py, mirrored in
src/ml/model.ts; full text also lives in formula.py's header):

  Normalized components, each 0..1:
      rain24n = min(rainfall    / 150,  1)
      rain3dn = min(rainfall_3d / 350,  1)
      rain30dn= min(rainfall_30d/ 1200, 1)
      soiln   = soil_moisture / 100
      slopen  = min(slope / 45, 1)
  base = 100 * (0.30*rain24n + 0.25*rain3dn + 0.20*rain30dn
                + 0.15*soiln + 0.10*slopen)
  ISRO-style logistic boost:  P = 1/(1+exp(-z)),
      z = -3.817 + 0.0077*rainfall + 0.0058*rainfall_3d + 0.0009*rainfall_30d
      (published ISRO coefficients 0.077/0.058/0.009 scaled x0.1 — raw values
      saturate on cumulative sums; see formula.py header for the honesty note)
  score = round(0.8*base + 20*P) capped 0..100
  Levels: >=80 Critical, >=65 High, >=40 Moderate, else Low.

  Labels are FORMULA-DERIVED from real ERA5 weather — a transparent heuristic,
  not observed landslide outcomes. Metrics below measure formula fidelity on
  unseen years; real-world skill is measured by ml/backtest.py.

TRAINING
  Temporal split: train = year <= 2020, test = 2021-2022.
  RandomForestRegressor(200) vs GradientBoostingRegressor(200),
  random_state=42. Best model by test MAE is saved to ml/model.pkl and the
  comparison to ml/metrics.json. The final labelled dataset (features +
  risk_score + risk_level) is written to ml/dataset.csv.
"""
import json
import os

import joblib
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

from formula import level_of, risk_score

HERE = os.path.dirname(os.path.abspath(__file__))
FEATURES = ["rainfall", "rainfall_3d", "rainfall_30d", "soil_moisture", "slope"]


def main():
    df = pd.read_csv(os.path.join(HERE, "dataset_features.csv"))
    df["risk_score"] = [risk_score(r.rainfall, r.rainfall_3d, r.rainfall_30d,
                                   r.soil_moisture, r.slope)
                        for r in df.itertuples()]
    df["risk_level"] = [level_of(s) for s in df["risk_score"]]
    cols = ["zone", "state", "week_end", "year", "rainfall", "rainfall_3d",
            "rainfall_30d", "soil_moisture", "slope", "risk_score",
            "risk_level", "weather_source"]
    df[cols].to_csv(os.path.join(HERE, "dataset.csv"), index=False)
    print(f"Labelled dataset: {len(df)} rows -> ml/dataset.csv")
    print("Level distribution:", df["risk_level"].value_counts().to_dict())

    train = df[df["year"] <= 2020]
    test = df[df["year"] >= 2021]
    print(f"Train rows (<=2020): {len(train)}  Test rows (2021-2022): {len(test)}")

    models = {
        "RandomForest": RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1),
        "GradientBoosting": GradientBoostingRegressor(n_estimators=200, random_state=42),
    }
    results = {}
    for name, model in models.items():
        model.fit(train[FEATURES], train["risk_score"])
        pred = model.predict(test[FEATURES])
        mae = mean_absolute_error(test["risk_score"], pred)
        r2 = r2_score(test["risk_score"], pred)
        lvl_ok = sum(level_of(round(float(p))) == actual
                     for p, actual in zip(pred, test["risk_level"]))
        acc = 100.0 * lvl_ok / len(test)
        results[name] = (model, mae, r2, acc)
        print(f"{name}: MAE={mae:.2f}  R2={r2:.4f}  LevelAccuracy={acc:.1f}%")

    best_name = min(results, key=lambda n: results[n][1])
    model, mae, r2, acc = results[best_name]
    print(f"BEST: {best_name} (MAE={mae:.2f})")
    joblib.dump(model, os.path.join(HERE, "model.pkl"))

    imp = {f: round(100.0 * float(v), 1)
           for f, v in zip(FEATURES, model.feature_importances_)}
    metrics = {
        "bestModel": best_name,
        "mae": round(float(mae), 2),
        "r2": round(float(r2), 4),
        "levelAccuracy": round(float(acc), 1),
        "trainRows": int(len(train)),
        "testRows": int(len(test)),
        "featureImportance": imp,
        "allModels": {n: {"mae": round(float(v[1]), 2), "r2": round(float(v[2]), 4),
                          "levelAccuracy": round(float(v[3]), 1)}
                      for n, v in results.items()},
    }
    with open(os.path.join(HERE, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
    print("Feature importance:", imp)
    print("Saved ml/model.pkl and ml/metrics.json")


if __name__ == "__main__":
    main()
