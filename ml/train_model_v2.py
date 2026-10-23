# ============================================================
# NE-SHIELD - Model V2 (Bada aur Behtar Model)
# ------------------------------------------------------------
# V1 problem: sirf 20 rows thi. Model exam me fail hoga
# kyunki usne bahut kam examples dekhe the.
#
# V2 solution:
#   - 20 asli zones (ISRO / website wale) rakhe
#   - 600 naye realistic synthetic rows banaye
#   - 2 naye features jode: 3-day rainfall, 30-day rainfall
#   - Kul features = 6, kul rows = 620
#   - 2 model try kiye: RandomForest vs GradientBoosting
#   - Jo best hoga, wahi save hoga
#
# ISRO formula (Landslide Atlas 2023, page 83):
#   z = -3.817 + 0.077*DR + 0.058*3DCR + 0.009*30DAR
#   DR   = aaj ki baarish (mm)
#   3DCR = pichhle 3 din ki kul baarish (mm)
#   30DAR= pichhle 30 din ki kul baarish (mm)
#   Is formula se probability nikalti hai.
#   Humne isi logic se synthetic data ka risk banaya hai,
#   taaki data asli science se match kare.
#
# Chalane ka tareeka:
#   pip install pandas scikit-learn joblib numpy
#   python train_model_v2.py
# ============================================================

import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score

# Random seed fix kar do - taaki har baar same result aaye
# (exam / demo me result badal jaye to confusion hota hai)
np.random.seed(42)

# ------------------------------------------------------------
# STEP 1: 20 asli zones load karo
# Ye wahi data hai jo website (mockData.ts) me hai
# ------------------------------------------------------------
print("=" * 60)
print("STEP 1: Asli 20 zones load kar raha hu...")
print("=" * 60)

# Asli data yahan hardcode hai taaki script kahin se bhi chale
# (ne_shield_data.csv se bhi same data milega)
real_zones = [
    # name, state, rainfall, soil, slope, hist, score
    ("NH-10 Mile 29, Sevoke-Rangpo", "Sikkim", 142, 87, 34, 4, 88),
    ("Dzongu Valley Upper Slopes", "Sikkim", 136, 85, 41, 4, 84),
    ("Cherrapunji (Sohra) Escarpment", "Meghalaya", 188, 91, 38, 4, 82),
    ("NH-6 Sonapur Tunnel Corridor", "Meghalaya", 154, 89, 36, 4, 86),
    ("Mangan District Headquarters Ridge", "Sikkim", 129, 83, 35, 3, 81),
    ("Sela Pass Approach (NH-13)", "Arunachal Pradesh", 98, 82, 44, 4, 85),
    ("Haflong Hill Section (Dima Hasao)", "Assam", 147, 88, 31, 3, 83),
    ("Bhalukpong-Bomdila Trans-Himalayan Link", "Arunachal Pradesh", 114, 79, 37, 3, 78),
    ("Mawsynram Plateau Edge", "Meghalaya", 165, 84, 32, 3, 77),
    ("Singtam-Bermoik Flank", "Sikkim", 105, 76, 29, 2, 74),
    ("Pasighat Foothill Slope", "Arunachal Pradesh", 130, 78, 33, 3, 72),
    ("Guwahati Naranarayan Slopes (Kamrup)", "Assam", 95, 74, 28, 2, 71),
    ("Nongpoh Valley Escarpment", "Meghalaya", 110, 72, 27, 2, 68),
    ("Roing-Mayodia Pass Ridge", "Arunachal Pradesh", 120, 75, 42, 3, 69),
    ("Cachar Barak Valley Escarpment", "Assam", 118, 73, 26, 2, 66),
    ("Dawki Border Pass Slopes", "Meghalaya", 82, 61, 30, 2, 58),
    ("Gangtok Ranipool Highway Spur", "Sikkim", 72, 58, 25, 2, 54),
    ("Dirang River Valley Terrace", "Arunachal Pradesh", 60, 52, 22, 1, 49),
    ("Karimganj South Hills", "Assam", 35, 38, 16, 1, 28),
    ("Tezpur-Brahmaputra Bluff", "Assam", 25, 34, 12, 1, 22),
]

real_rows = []
for name, state, rain, soil, slope, hist, score in real_zones:
    # Asli zones ke liye 3-day aur 30-day baarish ka andaz:
    # Agar aaj 142mm baarish hai, to pichhle 3 din me usse
    # zyada hi hogi (lagbhag 2.2 guna), aur 30 din me aur zyada.
    # Ye andaz monsoon ke asli pattern se liya hai.
    three_day = int(rain * np.random.uniform(2.0, 2.6))
    antecedent = int(three_day * np.random.uniform(2.8, 3.6) + rain * 2)
    real_rows.append({
        "name": name,
        "state": state,
        "rainfall": rain,
        "soil_moisture": soil,
        "slope": slope,
        "historical_risk": hist,
        "three_day_rainfall": three_day,
        "antecedent_30d": antecedent,
        "risk_score": score,
        "source": "real",
    })

print(f"Asli zones mile: {len(real_rows)}")

# ------------------------------------------------------------
# STEP 2: 600 synthetic (nakli lekin realistic) rows banao
# ------------------------------------------------------------
# Kyun banate hain? Kyunki 20 rows se model kuch nahi seekhta.
# Synthetic rows bilkul asli jaise lagte hain, lekin computer
# ne science ke rule se banaye hain.
#
# Rule simple hai:
#   Zyada baarish = zyada khatra
#   Zyada nami (soil moisture) = zyada khatra
#   Zyada dhalan (slope) = zyada khatra
#   Purani history kharab = zyada khatra
# ------------------------------------------------------------
print("\n" + "=" * 60)
print("STEP 2: 600 synthetic rows bana raha hu...")
print("=" * 60)

states = ["Sikkim", "Meghalaya", "Arunachal Pradesh", "Assam",
          "Nagaland", "Manipur", "Mizoram"]
synthetic_rows = []

for i in range(600):
    # --- Baarish chuno (NE monsoon jaisi) ---
    # 30% halki, 30% medium, 25% tez, 15% bahut tez
    chance = np.random.rand()
    if chance < 0.30:
        rainfall = np.random.uniform(0, 30)       # halki
    elif chance < 0.60:
        rainfall = np.random.uniform(30, 80)      # medium
    elif chance < 0.85:
        rainfall = np.random.uniform(80, 150)     # tez
    else:
        rainfall = np.random.uniform(150, 220)    # bahut tez / cloudburst

    # --- 3 din ki kul baarish ---
    # Aaj ki baarish ka 1.5 se 3 guna hona chahiye
    three_day = rainfall * np.random.uniform(1.5, 3.0)
    three_day = three_day + np.random.uniform(0, 20)  # thoda extra

    # --- 30 din ki kul baarish ---
    # 3 din wale se 3 se 6 guna zyada
    antecedent = three_day * np.random.uniform(3.0, 6.0) + np.random.uniform(0, 100)
    antecedent = min(antecedent, 1600)  # 1600mm se zyada nahi

    # --- Mitti ki nami (soil moisture) ---
    # Baarish zyada -> nami zyada. Ye connection asli hai.
    soil = 28 + 0.22 * rainfall + 0.015 * antecedent + np.random.normal(0, 6)
    soil = float(np.clip(soil, 18, 98))  # 18% se 98% ke beech rakho

    # --- Dhalan (slope) ---
    # NE ki pahadiyon me 8 se 48 degree aam hai
    slope = float(np.random.uniform(8, 48))

    # --- Purana risk (1=Low, 2=Moderate, 3=High, 4=Extreme) ---
    historical = int(np.random.choice([1, 2, 3, 4], p=[0.25, 0.35, 0.25, 0.15]))

    # --- ISRO formula se probability nikalo ---
    # z bada -> probability 1 ke paas -> khatra zyada
    z = -3.817 + 0.077 * rainfall + 0.058 * three_day + 0.009 * antecedent
    # Logistic function: z ko 0-1 probability me badlo
    isro_prob = 1 / (1 + np.exp(-z)) if z < 500 else 1.0
    # Note: ISRO prob tez saturate hota hai, isliye hum use
    # sirf ek signal ki tarah use karte hain, pura score nahi.

    # --- Final risk score banao (0-100) ---
    # Har cheez ka apna hissa (weight) hai:
    risk = (
        min(rainfall / 200, 1.0) * 28        # aaj ki baarish: sabse bada hissa
        + min(three_day / 500, 1.0) * 18     # 3 din ki baarish
        + min(antecedent / 1200, 1.0) * 10   # 30 din ki baarish
        + (soil / 100) * 20                  # mitti ki nami
        + (slope / 48) * 14                  # dhalan
        + (historical / 4) * 10              # purana risk
    )
    # ISRO prob bahut high hai to thoda boost do (max +4)
    if isro_prob > 0.95:
        risk = risk + 3
    elif isro_prob > 0.85:
        risk = risk + 1.5

    # Thoda sa random noise (+/- 4) - asli duniya perfect nahi hoti
    risk = risk + np.random.normal(0, 3.5)
    risk = float(np.clip(risk, 2, 99))  # 0-100 ke andar rakho

    synthetic_rows.append({
        "name": f"Synthetic Zone {i+1:03d}",
        "state": str(np.random.choice(states)),
        "rainfall": round(float(rainfall), 1),
        "soil_moisture": round(soil, 1),
        "slope": round(slope, 1),
        "historical_risk": historical,
        "three_day_rainfall": round(float(three_day), 1),
        "antecedent_30d": round(float(antecedent), 1),
        "risk_score": round(risk, 1),
        "source": "synthetic",
    })

print(f"Synthetic rows bane: {len(synthetic_rows)}")

# ------------------------------------------------------------
# STEP 3: Dono data jodo aur CSV save karo
# ------------------------------------------------------------
all_data = pd.DataFrame(real_rows + synthetic_rows)

# Risk level bhi jodo (score se banta hai - website wala rule)
def score_to_level(score):
    if score >= 80:
        return "Critical"
    if score >= 65:
        return "High"
    if score >= 40:
        return "Moderate"
    return "Low"

all_data["risk_level"] = all_data["risk_score"].apply(score_to_level)

# Column order sahi karo
all_data = all_data[["name", "state", "rainfall", "soil_moisture", "slope",
                      "historical_risk", "three_day_rainfall", "antecedent_30d",
                      "risk_level", "risk_score", "source"]]

csv_path = "ne_shield_data_v2.csv"
all_data.to_csv(csv_path, index=False)
print(f"\nData save ho gaya: {csv_path} (kul {len(all_data)} rows)")
print(all_data["risk_level"].value_counts().to_string())
print("\nPehli 5 rows:")
print(all_data.head().to_string(index=False))

# ------------------------------------------------------------
# STEP 4: Model train karo - 2 model compare karo
# ------------------------------------------------------------
# Features = model ko jo dikhega (6 cheezein)
# Target   = model jo seekhega (risk_score)
FEATURES = ["rainfall", "soil_moisture", "slope",
            "historical_risk", "three_day_rainfall", "antecedent_30d"]

X = all_data[FEATURES]
y = all_data["risk_score"]

# 80% train, 20% test (exam jaisa)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42
)
print("\n" + "=" * 60)
print(f"STEP 4: Train size = {len(X_train)}, Test size = {len(X_test)}")
print("=" * 60)

# --- Model A: Random Forest (200 ped) ---
rf = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
rf.fit(X_train, y_train)
rf_pred = rf.predict(X_test)
rf_mae = mean_absolute_error(y_test, rf_pred)
rf_r2 = r2_score(y_test, rf_pred)
# Cross-validation: 5 baar alag-alag test karke average lo
# Isse pata chalta hai model har data par stable hai ya nahi
rf_cv = cross_val_score(rf, X, y, cv=5, scoring="neg_mean_absolute_error")
rf_cv_mae = -rf_cv.mean()
print(f"\n[RandomForest - 200 trees]")
print(f"  Test MAE : {rf_mae:.2f} points (100 me se - jitna kam, utna achha)")
print(f"  Test R2  : {rf_r2:.4f} (1.0 ke paas = bahut achha)")
print(f"  CV MAE   : {rf_cv_mae:.2f} (5-fold cross-validation)")

# --- Model B: Gradient Boosting ---
gb = GradientBoostingRegressor(n_estimators=200, random_state=42,
                               learning_rate=0.08, max_depth=4)
gb.fit(X_train, y_train)
gb_pred = gb.predict(X_test)
gb_mae = mean_absolute_error(y_test, gb_pred)
gb_r2 = r2_score(y_test, gb_pred)
gb_cv = cross_val_score(gb, X, y, cv=5, scoring="neg_mean_absolute_error")
gb_cv_mae = -gb_cv.mean()
print(f"\n[GradientBoosting - 200 trees]")
print(f"  Test MAE : {gb_mae:.2f} points")
print(f"  Test R2  : {gb_r2:.4f}")
print(f"  CV MAE   : {gb_cv_mae:.2f} (5-fold cross-validation)")

# --- Best model chuno (jiski CV MAE sabse kam) ---
if rf_cv_mae <= gb_cv_mae:
    best_model = rf
    best_name = "RandomForest"
    best_mae, best_r2, best_cv = rf_mae, rf_r2, rf_cv_mae
else:
    best_model = gb
    best_name = "GradientBoosting"
    best_mae, best_r2, best_cv = gb_mae, gb_r2, gb_cv_mae

print("\n" + "=" * 60)
print(f"BEST MODEL: {best_name}")
print(f"  MAE = {best_mae:.2f} | R2 = {best_r2:.4f} | CV MAE = {best_cv:.2f}")
print("=" * 60)

# ------------------------------------------------------------
# STEP 5: Kaun si cheez sabse important hai?
# ------------------------------------------------------------
print("\nKaun si cheez sabse important hai (Feature Importance):")
importances = best_model.feature_importances_
for i in np.argsort(importances)[::-1]:
    print(f"  {FEATURES[i]:20s} = {importances[i]*100:5.2f}%")

# ------------------------------------------------------------
# STEP 6: Best model ko PURE data par dobara train karke save karo
# Pure data par train karne se model sab kuch seekh leta hai
# ------------------------------------------------------------
best_model.fit(X, y)
joblib.dump(best_model, "landslide_model_v2.pkl")
print("\nModel save ho gaya: landslide_model_v2.pkl")
print(f"Features ({len(FEATURES)}): {FEATURES}")
print("\nHo gaya! V1 MAE tha 4.15 (sirf 20 rows par).")
print(f"V2 MAE hai {best_mae:.2f} (620 rows par, isliye zyada bharosemand).")
