# ============================================================
# NE-SHIELD - Nayi jagah ka landslide risk check karo
# Pehle train_model.py chalana zaroori hai (model wahi banta hai)
# Chalane ka tareeka:  python predict.py
# ============================================================

import joblib
import pandas as pd

# Step 1: Save kiya hua model load karo
model = joblib.load("landslide_model.pkl")

# Step 2: Nayi jagah ki values yaha badal ke dekho
# (ye ek example hai - bhaari baarish, zyada nami, tez dhalan)
rainfall = 150         # mm / 24h
soil_moisture = 88     # %
slope = 36             # degrees
historical_risk = 4    # Low=1, Moderate=2, High=3, Extreme=4

# Step 3: Model se risk score poochho (0-100)
new_zone = pd.DataFrame(
    [[rainfall, soil_moisture, slope, historical_risk]],
    columns=["rainfall", "soil_moisture", "slope", "historical_risk"],
)
score = round(model.predict(new_zone)[0])

# Step 4: Score ko risk level me badlo (website wala rule)
if score >= 80:
    level = "Critical"
elif score >= 65:
    level = "High"
elif score >= 40:
    level = "Moderate"
else:
    level = "Low"

print("Rainfall       :", rainfall, "mm")
print("Soil Moisture  :", soil_moisture, "%")
print("Slope          :", slope, "degrees")
print("Historical Risk:", historical_risk)
print("------------------------------")
print("Predicted Risk Score:", score, "/ 100")
print("Predicted Risk Level:", level)
