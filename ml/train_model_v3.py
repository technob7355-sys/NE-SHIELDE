# ============================================================
# NE-SHIELD - Model V3 Training (Historical Real Weather)
# ------------------------------------------------------------
# V3 me kya naya hai?
#   - Data synthetic NAHI hai: Open-Meteo Archive ka asli
#     2018-2022 monsoon weather hai (ne_shield_historical_v3.csv,
#     fetch_historical.py se bana, 20 zones x weekly rows)
#   - Split bhi asli exam jaisa hai: TEMPORAL split
#       Train: saal <= 2020 (purana data)
#       Test : saal 2021-2022 (naya data, model ne kabhi nahi dekha)
#     Random shuffle split yahan galat hota, kyunki asli duniya
#     me model ko hamesha FUTURE predict karna hota hai.
#   - 2 model compare: RandomForest (200) vs GradientBoosting (200)
#   - Jeetne wala model: landslide_model_v3.pkl me save hoga
#
# Chalana:  python3 train_model_v3.py
# ============================================================

import joblib
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

HERE = __file__.rsplit("/", 1)[0] if "/" in __file__ else "."
CSV = HERE + "/ne_shield_historical_v3.csv"

# Model ko jo 6 cheezein dikhengi (features)
FEATURES = ["rainfall", "soil_moisture", "slope",
            "historical_risk", "three_day_rainfall", "antecedent_30d"]


def score_to_level(s):
    # Website wala hi rule: 80+ Critical, 65+ High, 40+ Moderate, warna Low
    if s >= 80:
        return "Critical"
    if s >= 65:
        return "High"
    if s >= 40:
        return "Moderate"
    return "Low"


def evaluate(name, model, X_test, y_test):
    # Model se test data par prediction karwao
    pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, pred)
    r2 = r2_score(y_test, pred)
    # Level accuracy: score ko level me badal kar asli level se milao
    true_levels = [score_to_level(v) for v in y_test]
    pred_levels = [score_to_level(v) for v in pred]
    correct = sum(1 for a, b in zip(true_levels, pred_levels) if a == b)
    acc = correct / len(y_test) * 100
    print(f"\n[{name}]")
    print(f"  Test MAE       : {mae:.2f} points (jitna kam, utna achha)")
    print(f"  Test R2        : {r2:.4f} (1.0 ke paas = bahut achha)")
    print(f"  Level Accuracy : {acc:.1f}%  ({correct}/{len(y_test)} sahi level)")
    # Per-level confusion: kis level ko model kis level samajh baitha
    levels = ["Low", "Moderate", "High", "Critical"]
    print("  Per-level confusion (asli -> predicted counts):")
    for lv in levels:
        row = {p: 0 for p in levels}
        total_lv = 0
        for a, b in zip(true_levels, pred_levels):
            if a == lv:
                row[b] += 1
                total_lv += 1
        if total_lv:
            print(f"    {lv:9s} (n={total_lv:3d}): " +
                  ", ".join(f"{p}={row[p]}" for p in levels))
    return mae, r2, acc, pred


def main():
    print("=" * 60)
    print("NE-SHIELD V3 - Temporal Split Training")
    print("=" * 60)
    data = pd.read_csv(CSV)
    print(f"Kul rows: {len(data)}")
    print(f"Saal: {sorted(data['year'].unique())}")

    # TEMPORAL SPLIT - purana saal train, naya saal test
    train = data[data["year"] <= 2020]
    test = data[data["year"] >= 2021]
    X_train, y_train = train[FEATURES], train["risk_score"]
    X_test, y_test = test[FEATURES], test["risk_score"]
    print(f"Train rows (<=2020): {len(train)}")
    print(f"Test  rows (2021-2022): {len(test)}")

    # Model A: Random Forest - 200 ped (trees), har ped alag राय देता है
    rf = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    rf_mae, rf_r2, rf_acc, _ = evaluate("RandomForestRegressor (200 trees)", rf, X_test, y_test)

    # Model B: Gradient Boosting - 200 ped, ek dusre ki galti sudhaarte hue
    gb = GradientBoostingRegressor(n_estimators=200, random_state=42,
                                   learning_rate=0.08, max_depth=4)
    gb.fit(X_train, y_train)
    gb_mae, gb_r2, gb_acc, _ = evaluate("GradientBoostingRegressor (200 trees)", gb, X_test, y_test)

    # Best model chuno - jiski test MAE sabse kam
    if rf_mae <= gb_mae:
        best, best_name, b_mae, b_r2, b_acc = rf, "RandomForest", rf_mae, rf_r2, rf_acc
    else:
        best, best_name, b_mae, b_r2, b_acc = gb, "GradientBoosting", gb_mae, gb_r2, gb_acc

    print("\n" + "=" * 60)
    print(f"BEST MODEL: {best_name}")
    print(f"  Test MAE = {b_mae:.2f} | R2 = {b_r2:.4f} | Level Accuracy = {b_acc:.1f}%")
    print("=" * 60)

    # Kaun si cheez sabse important hai?
    print("\nFeature Importance (kaun si cheez sabse zyada important):")
    for i in sorted(range(len(FEATURES)), key=lambda i: -best.feature_importances_[i]):
        print(f"  {FEATURES[i]:20s} = {best.feature_importances_[i] * 100:5.2f}%")

    # Best model ko TEST ke liye waisa hi save karo jaisa train hua tha
    # (sirf <=2020 data par trained - taaki backtest imaandaar rahe:
    #  2021-2022 ki ghatnaon ko model ne pehle kabhi nahi dekha)
    out = HERE + "/landslide_model_v3.pkl"
    joblib.dump(best, out)
    print(f"\nModel save ho gaya: {out}")
    print(f"METRICS_FOR_TS: mae={b_mae:.2f} r2={b_r2:.4f} level_acc={b_acc:.1f} best={best_name}")


if __name__ == "__main__":
    main()
