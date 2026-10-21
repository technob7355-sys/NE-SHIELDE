# NE-SHIELD — AI Landslide Risk Model (Random Forest)

Ye folder NE-SHIELD website ke liye banaya gaya pehla AI/ML model hai.

## Model kya karta hai?

4 cheezein dekh ke kisi bhi jagah ka **Risk Score (0–100)** batata hai —
wahi score jo website `src/types.ts` me use hota hai. Risk level isi
score se banta hai: 80+ Critical, 65+ High, 40+ Moderate, usse kam Low.

| Input | Matlab |
|---|---|
| `rainfall` | 24 ghante ki baarish (mm) |
| `soil_moisture` | Mitti me nami (%) |
| `slope` | Dhalan (degrees) |
| `historical_risk` | Purana risk — Low=1, Moderate=2, High=3, Extreme=4 |

**Output:** `risk_score` (0–100) + usse bana `risk_level`

## Kyun Random Forest?

Beginner ke liye sabse best hai — code chhota hai, samajhna easy hai
(100 trees apna-apna andaz lagate hain, sabka average final score),
aur chhote data par bhi achha kaam karta hai. Baad me isi code me
XGBoost lagana bhi easy hoga, sirf model wali line badlegi.

## Data kahan se aaya?

`ne_shield_data.csv` me website ke **real 20 risk zones** hain
(`src/data/mockData.ts` se liye gaye — Sikkim, Meghalaya,
Arunachal Pradesh, Assam ke zones), unke asli risk scores ke saath.

## Kaise chalaye?

```bash
cd ml
pip install -r requirements.txt
python train_model.py    # model train hoga, galti (MAE) dikhegi, model save hoga
python predict.py        # nayi jagah ka risk check karo
```

## Test result (21 Oct 2026 ko check kiya gaya)

- Test zones par model ki **average galti sirf ~4.15 points** hai (100 me se)
- Sabse important cheez model ke hisaab se: **soil moisture (~41%)**, phir slope (~25%), phir rainfall (~19%)

`predict.py` me upar ki 4 values badal ke kisi bhi nayi jagah ka
risk test kar sakte ho.

## Sach baat — data abhi kam hai

20 rows ek **starter model** ke liye hai. Asli model ke liye aur
data chahiye hoga. Aage ka plan simple hai:

1. `ne_shield_data.csv` me aur zones / purane landslide records ki rows jodo
   (ISRO Landslide Atlas ka data `src/data/isroLandslideAtlas.ts` me pehle se hai)
2. `python train_model.py` dobara chalao
3. Galti pehle se kam milegi

## Files

- `ne_shield_data.csv` — training data (website ke 20 real zones + unke risk scores)
- `train_model.py` — model train karne ki file (step-by-step comments ke saath)
- `predict.py` — nayi jagah ka risk score + level predict karne ki file
- `requirements.txt` — zaroori libraries
- `landslide_model.pkl` — train hone ke baad banta hai (save kiya hua model, git me nahi jata — train karne se dobara ban jata hai)
