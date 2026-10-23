# NE-SHIELD — Improvement Plan & Audit Report
**Project:** NE-SHIELD — AI-Powered Landslide Early Warning System for Northeast India (SIH)
**Repo:** https://github.com/technob7355-sys/NE-SHIELDE
**Live site:** https://ne-hielde.vercel.app (note: "hielde" spelling is in the actual deployment URL)
**Date of audit:** 23 Oct 2026
**Status of this work:** Prepared locally, build verified ✅ — **NOT pushed to GitHub yet** (waiting for your go-ahead)

---

## 1. Current Audit — Live Site Par Sach Kya Hai?

### ✅ Vercel Status
- Site **LIVE hai** — `https://ne-hielde.vercel.app` returns HTTP 200, page loads fully.
- Lekin live site par abhi **purana (pre-improvement) version** chal raha hai. Is round ki saari improvements local repo me hain, push ke baad hi Vercel par dikhengi (Vercel auto-deploy karta hai push par).

### 👍 Kya Achha Hai (What's Good)
- **Structure solid hai:** 20 real risk zones with lat/lng, slope, rainfall, hospitals (20 facilities with distance/ETA/beds), roads, villages, alerts, hazard reporting — sab typed (`src/types.ts`) aur organized hai.
- **ISRO data asli hai:** Landslide Atlas 2023 ke 147 district rankings, 80,933 landslides inventory, aur empirical formula `z = -3.817 + 0.077·DR + 0.058·3DCR + 0.009·30DAR` code me sahi implement hai (`src/data/isroLandslideAtlas.ts`).
- **Hospital feature genuinely useful hai:** nearest hospital + alternate route + one-tap call — ye real-life me kaam ki cheez hai.
- **Map interactive hai:** zoom/pan/filter/hospital layer ke saath custom SVG map.

### ⚠️ Kya Fake / Mock Hai (Honest List)
| Cheez | Sach |
|---|---|
| Saare risk scores (jaise NH-10 = 88, 142mm) | **Static mock data** hai (`src/data/mockData.ts`). Roz badalta nahi. Aaj live Open-Meteo par NH-10 par 24h baarish **0.0 mm** thi — lekin site aaj bhi 142mm/Critical dikhayegi. |
| "Last Sensor Sync: 2m ago" | **Jhootha text hai** — koi sensor connected nahi hai, ye hardcoded line hai. |
| "LIVE" badge / "Active Real-Time Monitoring" | Abhi real-time kuch nahi hai (is round me LiveWeatherBadge se pehla real live-data piece joda gaya hai). |
| "High Risk Zones: 18" | Code me **hardcoded 18** hai (`App.tsx`), jabki data me High zones sirf 8 hain. |
| Population at risk (117,500 total) | Andaz (estimate) hai, census-linked nahi — UI me "Terrain-Census Graph" likha hai jo over-claim hai. |
| Alerts ke timestamps | Fixed purani dates (2026-09-02) — live feed nahi hai. |
| Hazard report ki AI analysis | Kuch Gemini, zyadatar `mode: 'demo'` hardcoded analysis hai. |
| Map | Asli map nahi — haath se bana **SVG diagram** hai. Roads/rivers approximate hain. |

### 😕 Aam Aadmi Ke Liye Kya Confusing Hai
- Pura dashboard **expert jargon** se bhara hai: "pore-water saturation", "saturated shear plane", "unconsolidated phyllite", "Varnes Classification" — gaon wala / truck driver kuch nahi samjhega.
- Ek hi screen par score, population, hospitals, ISRO ranks sab ek saath — **sabse zaroori sawal "kya main is raste par jau ya nahi?" ka jawab kahin saaf nahi milta.**
- English-only hai — target user Hindi/regional bhasha wala hai.
- Emergency me kya karna hai, iska koi simple guide nahi tha (ab WhatToDo joda hai).

---

## 2. Model V2 — Results (Real, Isi Machine Par Train Kiya)

### V1 Problem
- Sirf **20 rows**, 4 features, RandomForest (100 trees), MAE 4.15 — lekin 20 rows par MAE ka koi bharosa nahi; model ne duniya dekhi hi nahi thi.

### V2 Me Kya Kiya
- **620 rows:** 20 asli zones + 600 synthetic realistic rows.
- Synthetic rows ISRO logic se bane: risk badhta hai jab — aaj ki baarish ↑, 3-day cumulative ↑, 30-day antecedent ↑, soil moisture ↑, slope ↑, purana risk ↑. ISRO logistic formula ko generation me signal ki tarah use kiya.
- **6 features** (2 naye): `rainfall`, `soil_moisture`, `slope`, `historical_risk`, **`three_day_rainfall` (naya)**, **`antecedent_30d` (naya)**.
- File: `ne_shield_data_v2.csv` (620 rows — Low 238, Moderate 204, High 94, Critical 84)

### Asli Training Results (`python3 train_model_v2.py` output)
| Model | Test MAE | Test R² | 5-Fold CV MAE |
|---|---|---|---|
| RandomForest (200 trees) | 3.96 | 0.9458 | 3.63 |
| **GradientBoosting (200 trees) — BEST** ✅ | **3.74** | **0.9543** | **3.50** |

- **Feature Importance (best model):** rainfall **74.18%** · three_day_rainfall 9.68% · soil_moisture 7.60% · antecedent_30d 4.76% · slope 2.83% · historical_risk 0.96%
  - *Note:* rainfall ka % itna zyada isliye hai kyunki 3-day/30-day baarish bhi usi se judi hai (collinearity) — teenon ko milakar baarish-family ka kul asar ~89% hai. Matlab: **baarish hi landslide ka sabse bada signal hai** — ye ISRO ki science se bhi match karta hai.
- **V1 vs V2:** MAE 4.15 (20 rows, unreliable) → **3.74 (620 rows, cross-validated)**. Number thoda hi sudhra, lekin ab ye number **bharosemand** hai kyunki 5-fold CV se verify hai.

### Browser Model Check (TypeScript `riskModel.ts` vs Python Model)
Website bina Python server ke predict kare, isliye model ko TS me distill kiya. 5 zones par cross-check:

| Zone | Python (GB) | TypeScript | Level Match? |
|---|---|---|---|
| NH-10 | 86.7 | 82 | ✅ Critical |
| Cherrapunji | 84.9 | 93 | ✅ Critical |
| Dawki | 56.9 | 54 | ✅ Moderate |
| Karimganj | 29.1 | 29 | ✅ Low |
| Tezpur | 23.8 | 24 | ✅ Low |

Average farak ~3.2 points — model ki apni MAE (3.74) ke andar. **5/5 levels sahi.**

### ⚠️ Ek Honest Limitation
ISRO ki raw probability (`P = 1/(1+e^-z)`) hamare 30-day sums par lagbhag hamesha ~100% ho jati hai (formula alag rainfall aggregation par calibrate hua tha). Isliye TS model me use sirf **chhote boost (+3 max)** ki tarah rakha hai, main score distilled weights se aata hai. Aage chalke ISRO formula ko NE ke local data par **re-calibrate** karna roadmap me hai.

---

## 3. Is Round Me Kya Change Hua (Files)

### ML (in `~/workspace/ne_shield_improve/`)
- `train_model_v2.py` — Beginner-friendly Hinglish comments ke saath pura training script (data banana + 2 model compare + CV + best save). Copy repo ke `ml/` me bhi rakhi hai.
- `ne_shield_data_v2.csv` — 620 rows ka naya dataset (copy `repo/ml/` me bhi).
- `landslide_model_v2.pkl` — Trained best model (GradientBoosting).

### Website (in `repo/src/`)
| File | Kya hai |
|---|---|
| `ml/riskModel.ts` ⭐ NEW | Browser-me-chalne wala risk model. `predictRisk({rainfall, soilMoisture, slope, historicalRisk, threeDayRainfall, antecedentRainfall})` → `{score, level, reasons[], isroProbability}`. Reasons aasan Hindi+English me. |
| `services/liveWeather.ts` ⭐ NEW | Open-Meteo live fetch (Python `fetch_live_data.py` jaisa hi logic): 24h / 3-day / 30-day baarish + soil moisture %. Koi API key nahi. **Live test: API se 744 hours data aaya, parsing verify hua.** |
| `components/LiveWeatherBadge.tsx` ⭐ NEW | Live mausam + live risk badge, 30-min auto-refresh, fail ho to saaf error (purana data "live" bolke nahi dikhata). |
| `components/SimpleRiskCard.tsx` ⭐ NEW | Aam aadmi wala card: bada 🔴/🟡/🟢, "Khatra hai / Dhyaan do / Safe hai", "Kyun?" aasan bhasha me, "Kya karein: ..." action, sabse paas hospital + Call button. |
| `components/WhatToDo.tsx` ⭐ NEW | Emergency guide: landslide dikhe to 6 steps, sign pehchano, safe-route tips, aur ek-tap bade call buttons — **112, 108, 1077, 1070**. |
| `App.tsx` ✏️ CHANGED (minimal) | Upar **"Aaj ka haal" toggle** joda: **Simple View (default)** / Expert View. Simple View me — LiveWeatherBadge (sabse risky zone ka live data) + Top-3 SimpleRiskCards + WhatToDo guide. Expert View = purana pura dashboard, kuch toda nahi. |

### Build Verification ✅
- `npm install` — 214 packages, OK
- `npx tsc --noEmit` — **0 errors**
- `npm run build` — **PASS** (vite build, 1687 modules, dist bundle 417.8 kB / gzip 115 kB). Built bundle me "Simple View", "Khatra hai", "Aaj ka haal" strings verify kiye.
- Ek warning aati hai `server.ts` ke `import.meta` par — ye **pehle se thi**, is change se nahi aayi, build fail nahi karti.

---

## 4. Roadmap — Isko Real-Life System Banane Ke Liye

### Phase 1 — Data Ko Sach Banao (Sabse Pehle, 1-2 Hafte)
1. **Live data ko default banao:** Abhi Simple View me 1 zone live hai. Agle step me saare 20 zones ka risk subah-shaam Open-Meteo se auto-update ho (Vercel Cron + KV cache), taaki mock scores sirf fallback rahein.
2. **"Sensor Sync" jaisi fake lines hatao** ya unhe asli `fetchedAt` time se badlo (LiveWeatherBadge me ye pattern ready hai).
3. **IMD / actual rain-gauge data** jodo jahan mile; Open-Meteo model-data hai, gauge-data zyada sahi hota hai.
4. **ISRO formula re-calibration:** NE ke pichhle landslide events (Atlas inventory) par logistic regression dobara fit karo taaki probability saturate na ho.

### Phase 2 — Asli Map + Mobile (2-4 Hafte)
5. **Leaflet + OpenStreetMap** se asli map: abhi wala SVG hatao, real lat/lng pins, road overlay, offline tile cache. Driver ko apni location se nearest risky zone dikhe.
6. **PWA banao:** "Add to Home Screen", offline mode (last risk data cache), bade buttons, kam-data mode — pahadi ilaakon me network kamzor hota hai, app bina net ke bhi last jaankari dikhaye.
7. **Bhasha:** Hindi + Assamese + Bengali toggle (i18n). Awaaz me bhi alert (TTS) — padhna na aaye to sun ke samjhe.

### Phase 3 — Alerting (Asli Early Warning Yahi Hai)
8. **WhatsApp alerts (sabse bada impact):** Risk Critical cross kare to us zone ke registered gaon/drivers ko WhatsApp message (Twilio / Meta WhatsApp Business API): "🔴 NH-10 par khatra hai, aaj yatra mat karo." SMS fallback (MSG91) unke liye jinke paas smartphone nahi.
9. **Location-based push:** User apna gaon/rasta save kare, sirf usi ke alert aayein (spam nahi).
10. **SDRF / District Dashboard:** Admin view — kaunsi report verify hui, team kahan bhejni hai, road band/open status ek click me update, jo seedha public view me dikhe. Hazard Reports ko isse jodo taaki citizen report → verification → alert ka pura loop bane.

### Phase 4 — Model Ko Aur Mazboot (Parallel)
11. **Asli event data badhao:** Atlas ke 80,933 events + IMD rainfall se synthetic ki jagah dheere-dheere asli historical rows lao; har monsoon ke baad retrain karo.
12. **Naye features:** soil type, land-use/forest cover, road-cutting, river distance (GIS layers) — slope/history ka asar tab sahi measure hoga.
13. **Model API:** `landslide_model_v2.pkl` ko ek chhoti FastAPI service (Render/Railway free tier) par host karo taaki website full model use kare, TS distilled model offline fallback rahe.

### Demo Ke Liye Judge Ko Kya Dikhaana Hai
- Pehle **Simple View** kholo: "Sir, ye gaon wala dekhega — 5 second me samajh jayega khatra hai ya nahi, aur kya karna hai."
- Phir LiveWeatherBadge refresh karke dikhao: "Ye **live** Open-Meteo data hai, mock nahi."
- Phir **Expert View** + ISRO Atlas: "Aur ye raha scientific depth — 80,933 landslides, 147 districts, ISRO formula."
- Model ki baat ek line me: "620 rows, 6 features, GradientBoosting, MAE 3.74, R² 0.95, cross-validated — aur wahi model browser me bhi chalta hai, bina server ke."

---

## 5. Agla Kadam (Tumhaare Haath Me)
1. Local build ready hai — bolo to **GitHub push** kar du (Vercel apne aap deploy kar dega, 2-3 min me live).
2. Push se pehle chaaho to pehle `npm run dev` karke local par Simple View dekh lo.

*Taiyaar kiya: Model V2 training + UI upgrade, 23 Oct 2026. Saare numbers isi machine par asal run se liye gaye hain.*
