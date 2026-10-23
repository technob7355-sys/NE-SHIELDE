# NE-SHIELD V3 — README

Landslide Early Warning System for Northeast India — V3 dashboard.
Is version ka sabse bada rule: **jo real hai wahi real dikhega, jo mock/formula-derived
hai uspar saaf label lagega.** Koi hardcoded count nahi, koi nakli "live" stamp nahi.

---

## Chalana Kaise Hai (Run Instructions)

```bash
cd ne_shield_v3/repo
npm install
npm run dev        # dev server (server.ts ke saath)
```

Sirf type-check karna ho:

```bash
npx tsc --noEmit
```

Production build (final sign-off coordinator karta hai):

```bash
npm run build
```

Koi API key / login nahi chahiye — Open-Meteo free hai.

---

## Architecture

```
src/
  App.tsx                        — 4 tabs wala main dashboard (V3 rewrite)
  types.ts                       — RiskZone, AlertItem, ... NavTab = overview|map|backtest|report
  components/
    ApiConnectorStatus.tsx       — VISIBLE connector bar (real fetch, asli time + latency)
    BacktestView.tsx             — asli ghatnaon par backtest + imaandari box
    SimpleRiskCard.tsx           — aam aadmi wala card (LIVE / MOCK DATA stamp ke saath)
    PredictionAudit.tsx          — Khula Hisaab: V3 model + ISRO formula + simple rule, 3-way check, audit JSON download
    ModelScoreboard.tsx          — V1 vs V2 vs V3 tulna + LIVE/MOCK/SYNTHETIC sach table
    LiveWeatherBadge.tsx         — live mausam badge (Open-Meteo)
    RiskMap.tsx                  — interactive risk map
    WhatToDo.tsx                 — emergency guide (112 / 108 / 1077)
    ReportHazardView.tsx         — citizen hazard report (demo fallback LABELLED hai)
    AlertsView.tsx               — alerts (V3 me Live Map tab ke neeche)
    Navbar.tsx                   — Overview | Live Map | Backtest | Report Hazard
    AiRiskScoreModal.tsx, IsroLandslideAtlasModal.tsx — purane modals (reuse)
  ml/
    riskModel.ts                 — V2 model (browser, distilled)
    riskModelV3.ts               — V3 model (browser) — Track A file, contract neeche hai
  services/
    liveWeather.ts               — Open-Meteo live weather service
    provenance.ts                — data ka saboot: source URL + fetched time + raw values + hash
  data/
    mockData.ts                  — 20 zones, roads, villages, alerts (ye MOCK hai — label lagta hai)
    backtestData.ts              — documented backtest cases — Track A file
    isroLandslideAtlas.ts, hospitalsData.ts
ml/                              — Python: data fetch, training, backtest scripts
```

### Dashboard ke 4 Tabs

| Tab | Kya hai |
|---|---|
| **Overview** | Upar ApiConnectorStatus bar. Default **Simple View**: top-3 zones ke live-weather SimpleRiskCards (live na mile to card par **MOCK DATA** stamp + provenance line), zone-selector ke saath PredictionAudit, ModelScoreboard. **Expert View** toggle: computed stats, RiskMap, ISRO banner, highest-risk card (hospitals ke saath). Neeche dono views me WhatToDo guide. |
| **Live Map** | Full-width RiskMap + selected zone detail + provenance + PredictionAudit + Alerts. |
| **Backtest** | BACKTEST_SUMMARY se badi accuracy %, events table (HIT/MISS + source links), controls table (CORRECT-REJECT/FALSE-ALARM), V1/V2/V3 scoreboard, imaandari box. |
| **Report Hazard** | ReportHazardView — AI analysis ka demo fallback upar banner me LABELLED hai. |

### V3 Model Contract (Track A ↔ Track B)

- `src/ml/riskModelV3.ts` exports: `RiskInput`, `RiskOutput`, `predictRiskV3(input)`,
  `predictRisk` (alias), `modelMeta { version:'V3', trainedOn, testPeriod, testMAE, r2, levelAccuracy }`
- `src/data/backtestData.ts` exports: `BacktestCase`, `BACKTEST_CASES`, `BACKTEST_SUMMARY`

### Computed Stats (koi hardcoded number nahi)

Overview ke saare counts — Critical zones, High zones, Roads at Risk, Active Alerts,
population at risk — render ke time `zones` / `roads` / `alerts` arrays se gin (compute)
kar ke aate hain. Purana pehle-se-likha-hua count wala bug V3 me hata diya gaya hai.

---

## API Connectors

Dono connectors dashboard ke **ApiConnectorStatus** bar me dikhai dete hain — page khulte hi
dono par **real lightweight fetch** jaata hai (NH-10 coordinates 27.17, 88.52). Green dot = fetch
safal, red dot = fail + asli error text. "Last fetch" time wahi hai jab response sach me pura
hua — kabhi hardcoded nahi hota. Har connector ka source URL clickable hai, khud khol ke
check kar sakte ho.

| Connector | URL |
|---|---|
| Open-Meteo **Forecast** API (LIVE mausam) | `https://api.open-meteo.com/v1/forecast?latitude=27.17&longitude=88.52&hourly=precipitation&past_days=1&forecast_days=1&timezone=Asia%2FKolkata` |
| Open-Meteo **Archive** API (purana mausam, ERA5) | `https://archive-api.open-meteo.com/v1/archive?latitude=27.17&longitude=88.52&start_date=2022-06-01&end_date=2022-06-07&daily=precipitation_sum&timezone=Asia%2FKolkata` |

Zone-wise live data + provenance (`src/services/provenance.ts`) bhi Forecast API hi use karta
hai (`past_days=31`, taaki 24h + 3-day + 30-day baarish aur soil moisture ek hi fetch se mile)
aur har fetch ke saath source name, pura URL, fetched time, raw values aur raw JSON ka hash
stamp rakhta hai. Fetch fail ho to `isLive=false` + error milta hai — UI us data ko **MOCK**
label ke saath dikhata hai.

---

## Model V3 — Training + Temporal Split

- **Input data (REAL):** Open-Meteo Archive API (ERA5) se pichhle saalo ki asli baarish —
  24h, 3-day aur 30-day rainfall, unhi ilaako ke coordinates par jahan model kaam karega.
- **Temporal split (sabse zaroori baat):** random split NAHI hai.
  - **Train: 2018–2020** ka data
  - **Test: 2021–2022** ka data — jo model ne training me dekha hi nahi
  Isse model "yaad kiya hua" data par pass nahi hota; naye samay par test hota hai,
  bilkul jaise asal zindagi me hoga (aaj train, kal prediction).
- **Labels (FORMULA-DERIVED — saaf bola gaya hai):** weekly risk labels ISRO Landslide
  Atlas ke formula / vigyaan ke niyamo se derived hain, kyunki koi official per-day
  landslide record public me uplabdh nahi hai. Input (baarish) real hai, label derived hai.
- Browser me chalne wala `riskModelV3.ts` isi Python model ka distilled version hai;
  uske test number `modelMeta` me rehte hain aur dashboard (Scoreboard + Backtest page)
  wahi se padhta hai — UI me koi model number hardcoded nahi hai.

### Pichhle versions se farak

| Model | Data | Test | Bharosa |
|---|---|---|---|
| V1 | Sirf 20 rows | MAE 4.15, koi CV nahi | Bharosa kam |
| V2 | 620 rows = 20 real + 600 **synthetic** | GB MAE 3.74, R² 0.9543, CV MAE 3.50, level acc 82.3% | Behtar, par data synthetic tha |
| V3 | Real archive weather (ERA5) | Temporal split 2018–2020 train / 2021–2022 test + asli backtest | Backtest se check hua |

---

## Backtest — Method + Dobara Kaise Chalayein

**Method:** Documented landslide events (har case ke saath source URL/title) aur control
cases (unhi ilaako ke aise din jab kuch nahi hua tha) chune gaye. Har case ke din ki
archive baarish (Open-Meteo/ERA5) V3 model ko di gayi:

- Event + model ne High/Critical bola → **HIT**
- Event + model chup raha → **MISS**
- Control + model chup raha → **CORRECT-REJECT**
- Control + model ne alarm bajaya → **FALSE-ALARM**

Accuracy = sahi cases / kul cases — dashboard ka Backtest tab yehi number
`BACKTEST_SUMMARY` se dikhata hai.

**Dobara chalana (re-run):**

```bash
cd ml
python fetch_historical.py    # Archive API se historical weather lao
python train_model_v3.py      # Temporal split par V3 train + test karo
python backtest.py            # Documented events/controls par backtest chalao
```

---

## Imaandari Section (Honesty) — Kya Real Hai, Kya Nahi

- **Kya real hai:** Archive rainfall (Open-Meteo/ERA5) — pichhle saalo ka asli mausam;
  live forecast fetch (time + hash stamp ke saath); documented backtest events, har ek
  ke source link ke saath; ISRO Landslide Atlas 2023 ke district records.
- **Kya formula-derived hai:** V3 ke weekly risk labels — koi official per-day landslide
  record public nahi hai, isliye labels ISRO formula se derived hain. Ye baat dashboard
  par bhi (Backtest page ka Imaandari Box) saaf likhi hai.
- **Kya synthetic tha:** V2 ka data — 620 rows me 600 rows computer-generated thi.
  V3 isi kamzori ko theek karne ke liye bana hai.
- **Kya MOCK hai:** `mockData.ts` ke 20 zones ke static number (baarish, score aadi) —
  ye roz nahi badalte. Jahan live fetch safal hota hai wahan LIVE stamp lagta hai;
  jahan nahi hota, wahan **MOCK DATA** stamp lagta hai. Kabhi nakli ko live nahi bola jata.
- **Kya DEMO hai:** Report Hazard ki AI photo analysis ka fallback — server/Gemini na mile
  to demo mode chalta hai aur result par "DEMO FALLBACK" label dikhta hai.
- **Jo nahi hai:** Is system ke paas koi ground sensor network nahi hai — isliye dashboard
  me koi sensor-status wala text hi nahi rakha gaya hai. Saare counts data se computed hain.
