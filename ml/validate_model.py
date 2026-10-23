# ============================================================
# NE-SHIELD - Model Validation Script (Model ki sachhai jaanch)
# ------------------------------------------------------------
# Sawal: "Model sahi hai ya galat — kaise pata chalega?"
# Ye script wahi jaanch karta hai jo dashboard ke
# "Model Bharosa Scoreboard" par dikhti hai:
#
#   TEST 1: Held-out test — model ko wo data dikhao jo usne
#           training me KABHI nahi dekha (620 me se 124 rows).
#           Uspar galti (MAE), R2 aur level accuracy nikalo.
#   TEST 2: 5-Fold Cross-Validation — pura data 5 hisso me
#           baant ke 5 baar test karo, average lo.
#   TEST 3: Jaane-pehchane 3 scenario — jinka sahi jawab
#           humein pehle se pata hai:
#             1) Bahut tez baarish wala din  -> Critical aana chahiye
#             2) Sukha, safe wala din        -> Low aana chahiye
#             3) Beech wala monsoon din      -> Moderate aana chahiye
#
# Har test ke saamne PASS / FAIL saaf print hoga.
# Dashboard par jo number hai, wahi yahan milna chahiye —
# agar na mile to dashboard galat hai, script nahi.
# (Random seed fix hai: 42 — isliye har baar same result.)
#
# Chalane ka tareeka:
#   pip install pandas scikit-learn
#   python validate_model.py
# ============================================================

from pathlib import Path

import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import cross_val_score, train_test_split

# ------------------------------------------------------------
# STEP 1: Data load karo (script ke saath wali CSV file)
# ------------------------------------------------------------
CSV_PATH = Path(__file__).parent / "ne_shield_data_v2.csv"
data = pd.read_csv(CSV_PATH)

FEATURES = ["rainfall", "soil_moisture", "slope",
            "historical_risk", "three_day_rainfall", "antecedent_30d"]

X = data[FEATURES]
y = data["risk_score"]

print("=" * 62)
print("NE-SHIELD MODEL VALIDATION — Sachhai ki jaanch")
print("=" * 62)
print(f"Kul data      : {len(data)} rows")
print(f"  Asli (real) : {(data['source'] == 'real').sum()} rows")
print(f"  Synthetic   : {(data['source'] == 'synthetic').sum()} rows")
print("  (Note: synthetic = computer ke banaye training rows.)")


# ------------------------------------------------------------
# Helper: score ko level me badlo (website wala hi rule)
# 80+ Critical | 65+ High | 40+ Moderate | baaki Low
# ------------------------------------------------------------
def score_to_level(score):
    if score >= 80:
        return "Critical"
    if score >= 65:
        return "High"
    if score >= 40:
        return "Moderate"
    return "Low"


# ------------------------------------------------------------
# TEST 1: Held-out test (80% train, 20% test — seed 42,
# bilkul waisa hi jaisa train_model_v2.py karta hai)
# Level accuracy: website score ko ROUND karke dikhata hai,
# isliye level bhi rounded score par check hoga.
# ------------------------------------------------------------
print("\n" + "-" * 62)
print("TEST 1: Held-out test (model ne ye 124 rows kabhi nahi dekhi)")
print("-" * 62)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42
)

model = GradientBoostingRegressor(
    n_estimators=200, random_state=42, learning_rate=0.08, max_depth=4
)
model.fit(X_train, y_train)
pred = model.predict(X_test)

mae = mean_absolute_error(y_test, pred)
r2 = r2_score(y_test, pred)

# Level accuracy: kitni rows ka level bilkul sahi pehchana?
sahi = 0
for asli_score, model_score in zip(y_test, pred):
    if score_to_level(round(model_score)) == score_to_level(asli_score):
        sahi = sahi + 1
level_accuracy = sahi / len(y_test) * 100

print(f"Test rows       : {len(y_test)}")
print(f"Galti (MAE)     : {mae:.2f} points (100 me se)  -> dashboard: 3.74")
print(f"R2              : {r2:.4f}                     -> dashboard: 0.9543")
print(f"Level accuracy  : {level_accuracy:.1f}% ({sahi}/{len(y_test)} rows ka level sahi)")
print(f"                    -> dashboard: 82.3% (102/124)")

test1_pass = round(mae, 2) == 3.74 and sahi == 102
print(f"TEST 1 RESULT   : {'PASS ✅' if test1_pass else 'FAIL ❌ — dashboard se number nahi mila!'}")


# ------------------------------------------------------------
# TEST 2: 5-Fold Cross-Validation
# Data ko 5 hisso me baanto, har baar 1 hisse par test karo.
# Ek hi test par luck chal sakta hai, 5 par nahi.
# ------------------------------------------------------------
print("\n" + "-" * 62)
print("TEST 2: 5-Fold Cross-Validation")
print("-" * 62)

cv_scores = cross_val_score(model, X, y, cv=5, scoring="neg_mean_absolute_error")
cv_mae = -cv_scores.mean()
print(f"CV MAE          : {cv_mae:.2f}  -> dashboard: 3.50")
test2_pass = round(cv_mae, 2) == 3.50
print(f"TEST 2 RESULT   : {'PASS ✅' if test2_pass else 'FAIL ❌'}")


# ------------------------------------------------------------
# TEST 3: Jaane-pehchane scenario (sahi jawab pehle se pata hai)
# Is test ke liye train_model_v2.py ki tarah model ko PURE
# data par train karte hain — wahi model jo save hota hai.
# ------------------------------------------------------------
print("\n" + "-" * 62)
print("TEST 3: Jaane-pehchane 3 scenario")
print("-" * 62)

final_model = GradientBoostingRegressor(
    n_estimators=200, random_state=42, learning_rate=0.08, max_depth=4
)
final_model.fit(X, y)

# Har scenario: [rainfall, soil, slope, history, 3-day, 30-day]
scenarios = [
    ("Bahut tez baarish (Cherrapunji jaisa din)",
     [188, 91, 38, 4, 393, 1525], "Critical"),
    ("Sukha safe din (Tezpur jaisa halka din)",
     [10, 30, 12, 1, 20, 150], "Low"),
    ("Beech wala monsoon din (Dawki jaisa din)",
     [82, 61, 30, 2, 180, 600], "Moderate"),
]

scenario_pass = 0
for naam, values, sahi_level in scenarios:
    # DataFrame bana ke do taaki feature ke naam sahi jayein
    ek_row = pd.DataFrame([values], columns=FEATURES)
    score = round(float(final_model.predict(ek_row)[0]))
    level = score_to_level(score)
    ok = level == sahi_level
    if ok:
        scenario_pass = scenario_pass + 1
    print(f"{naam}")
    print(f"   Model bola: {score}/100 = {level} | Sahi jawab: {sahi_level} "
          f"-> {'PASS ✅' if ok else 'FAIL ❌'}")

print(f"TEST 3 RESULT   : {scenario_pass}/3 PASS "
      f"{'✅' if scenario_pass == 3 else '❌'}")


# ------------------------------------------------------------
# FINAL: Poora saar
# ------------------------------------------------------------
print("\n" + "=" * 62)
sab_pass = test1_pass and test2_pass and scenario_pass == 3
print(f"FINAL VERDICT: {'SARE TEST PASS ✅ — dashboard ke number sahi hain' if sab_pass else 'KUCH TEST FAIL ❌ — pehle isko theek karo, phir bharosa karo'}")
print("=" * 62)
print("\nYaad rakho (imaandari wali baat):")
print("Ye test TRAINING DATA (600 synthetic rows ke saath) par hai.")
print("Asli landslide ghatnaon par backtest abhi baki hai —")
print("wahi model ka asli imtihaan hoga.")
