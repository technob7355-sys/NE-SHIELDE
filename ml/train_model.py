# ============================================================
# NE-SHIELD - Landslide Risk Prediction Model
# Model : Random Forest (beginner ke liye best)
# Kaam   : rainfall, soil moisture, slope aur history dekh ke
#          kisi jagah ka Risk Score (0-100) batata hai.
#          Website (src/types.ts) me bhi yahi score use hota hai,
#          aur risk level isi score se banta hai:
#            80-100 = Critical | 65-79 = High
#            40-64  = Moderate | 0-39  = Low
#
# Chalane ka tareeka:
#   1) pip install -r requirements.txt
#   2) python train_model.py
# ============================================================

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
import joblib

# ------------------------------------------------------------
# Step 1: Data load karo
# Ye data NE-SHIELDE website ke real 20 risk zones se liya hai
# (src/data/mockData.ts). Column samjho:
#   rainfall        = 24 ghante ki baarish (mm)
#   soil_moisture   = mitti me nami (%)
#   slope           = dhalan (degrees)
#   historical_risk = purana risk: Low=1, Moderate=2, High=3, Extreme=4
#   risk_score      = jawab jo model seekhega (0-100)
# ------------------------------------------------------------
data = pd.read_csv("ne_shield_data.csv")
print("Total zones:", len(data))
print(data.head())

# ------------------------------------------------------------
# Step 2: Input (X) aur Answer (y) alag karo
# ------------------------------------------------------------
X = data[["rainfall", "soil_moisture", "slope", "historical_risk"]]
y = data["risk_score"]

# ------------------------------------------------------------
# Step 3: Data ko 2 hisso me baanto
# 75% se model seekhega (train), 25% se test hoga (exam jaisa)
# ------------------------------------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42
)

# ------------------------------------------------------------
# Step 4: Random Forest model banao aur train karo
# Samjho: ye 100 ped (trees) banata hai, har ped apna andaz
# lagata hai, sabka average hi final risk score hota hai.
# ------------------------------------------------------------
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
print("\nModel train ho gaya!")

# ------------------------------------------------------------
# Step 5: Test karo - model ki galti kitni hai?
# Mean Absolute Error = model average kitne number
# idhar-udhar hota hai. 100 me se sirf ~4 ki galti matlab
# model ka andaz kaafi sahi hai.
# Note: abhi data sirf 20 zones ka hai, isliye ye ek starter
# model hai. ne_shield_data.csv me nayi rows jodoge to
# galti aur kam hoti jayegi.
# ------------------------------------------------------------
answer = model.predict(X_test)
error = mean_absolute_error(y_test, answer)
print("Average galti (MAE):", round(error, 2), "points (100 me se)")

print("\nTest result (asli score -> model ka score):")
for i in range(len(y_test)):
    print(" ", y_test.iloc[i], "->", round(answer[i], 1))

# ------------------------------------------------------------
# Step 6: Sabse important cheez kaun si hai?
# Model khud batata hai risk faisla lene me kis cheez ka
# weight sabse zyada hai.
# ------------------------------------------------------------
print("\nKaun si cheez sabse important hai:")
names = ["rainfall", "soil_moisture", "slope", "historical_risk"]
for i in range(len(names)):
    print(" ", names[i], "=", round(model.feature_importances_[i] * 100, 2), "%")

# ------------------------------------------------------------
# Step 7: Model save karo, taaki baad me bina train kiye
# predict.py se seedha istemal ho sake
# ------------------------------------------------------------
joblib.dump(model, "landslide_model.pkl")
print("\nModel save ho gaya: landslide_model.pkl")
