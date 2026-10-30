// Honest wet-day model (Oct 30, 2026) — the proof the Accuracy page shows.
// RandomForest trained AND tested ONLY on wet monsoon days.
// January (dry) controls are excluded from training AND testing entirely.
// Numbers verified: cd ~/workspace/ne_shield_v4/labeled_data && ~/mlenv/bin/python train_60_40.py
// Final model: train_wetday_final.py -> wetday_final_model.joblib (1,563 rows).
// Hand-maintained: update if the demo is re-run.

export const DEMO_INFO = {
  name: 'RandomForest (200 trees, sklearn 1.9.1)',
  accuracyPct: 68.3,
  accuracyLabel: 'honest accuracy — train bhi geele din, test bhi geele din',
  eventsCaught: 60,
  eventsTotal: 208,
  falseAlarms: 50,
  negativesTotal: 416,
  totalRows: 1563,
  eventRows: 521,
  hardNegRows: 1042,
  trainRows: 939,
  testRows: 624,
  trainDesc: 'purane 60% incident-groups (sirf geele din)',
  testDesc: 'naye 40% incident-groups (model ne ye kabhi dekhe nahi)',
  featureSource: 'Open-Meteo Archive (ERA5) + AWS Terrarium DEM slope, timezone Asia/Kolkata',
  verifyCommand: 'cd ~/workspace/ne_shield_v4/labeled_data && ~/mlenv/bin/python train_60_40.py',
  featureImportance: {
    '24h rainfall': 24.1,
    '3-day rainfall': 23.8,
    '30-day rainfall': 23.2,
    'slope (DEM)': 17.6,
    'soil moisture': 11.2,
  } as Record<string, number>,
};

export const DEMO_METHOD: string[] = [
  'January (sukhe) controls ko training AUR testing — dono se poori tarah hata diya. Model ne sirf geele monsoon din dekhe: 521 asli landslides + 1,042 aise geele din jab landslide NAHI hua (hard negatives — inki 30-din ki baarish median 448 mm, January walon ki sirf 11 mm).',
  'Har incident aur uske saare negatives ko ek group me bandh rakha (same jagah = location se cheating impossible), phir time se kaata: purane 60% groups train (939 rows), naye 40% groups test (624 rows). Model ne test wale din kabhi dekhe hi nahi.',
  'Verdict: event-day par sahi anumaan = HIT, choot gaya = MISS; geele non-event din par alarm baja = false alarm.',
  'Result: 68.3% (624 me se 426 sahi). 208 events me se 60 pakde, 416 geele non-event dino me 50 galat alarms. Ye number chhota hai par asli hai — isi par hum khade hain.',
];

export const DEMO_JOURNEY: { title: string; body: string }[] = [
  {
    title: 'Pehla number: 97.1% (October 27)',
    body: '521 asli landslides + 521 January controls par RandomForest ne 97.1% diya (272/280). 138/140 events pakde. Number dekh kar khushi hui — par sawaal utha: kya ye possible hai?',
  },
  {
    title: 'Asliyat check: model ne kya seekha tha?',
    body: 'January me baarish lagbhag zero hoti hai. Model ne "landslide samajhna" nahi, "monsoon vs winter pehchanna" seekh liya tha — isliye 30-din ki baarish sabse important feature bani (45.8%). Proof: jab use asli geele dino (baarish thi, landslide nahi hua) par test kiya to 97.9% galat alarms!',
  },
  {
    title: 'Faisla: sukhe din bahar (October 30)',
    body: 'January controls ko train SE BHI aur test SE BHI hata diya. Ab train bhi geele dino par, test bhi geele dino par — 60/40 ka imandaar holdout, model ne test wale din kabhi dekhe nahi.',
  },
  {
    title: 'Asli number: 68.3%',
    body: '624 naye geele dino par 426 sahi. 208 events me se 60 pakde, 50 false alarms. Chhota number, par isme koi dhokha nahi — ye wahi test hai jo asli duniya me hoga: geele din me landslide hoga ya nahi?',
  },
  {
    title: 'Iska matlab kya hai?',
    body: 'Sirf baarish + nami + slope se geele-din-wala-landslide aur geele-din-bina-landslide alag nahi hote. Agla zaroori tukda hai geology (chattan/mitti ka prakar) — wahi missing feature hai, aur hum ye khule me kehte hain.',
  },
];

export const DEMO_MISS_PATTERN =
  '208 events me se 148 miss hue. Pattern imandaari se: (1) kam-baarish wale events — jahan kaaran insaani tha (cutting, construction, road work), jo mausam-data me dikh hi nahi sakta; (2) aise geele din jo event-jaisi baarish rakhte hue bhi landslide nahi laaye — inhi ko alag karna model abhi seekh nahi paya. Miss chhupaye nahi, gine hain.';

export const DEMO_FALSE_ALARMS =
  '50 false alarms — 416 geele non-event dino me se. Matlab har 8 geele dino me lagbhag 1 galat alarm. Early-warning system me false alarm, miss se sasta padta hai — par hum number chhupate nahi, 50 ko 50 hi likhte hain.';

export const DEMO_HONEST_NOTE =
  'Teen numbers, teeno humne khud diye: V4 formula-model 97.5% (labels formula se bane the — asli parakh 14 cases par 57.1%, khud publish ki); January-control model 97.1% (test easy tha — monsoon vs winter, khud pakda); wet-day model 68.3% (train bhi geele din, test bhi geele din — asli test). Progress ka matlab bada number nahi, saccha number hai.';
