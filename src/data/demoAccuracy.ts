// Demo baseline model (Oct 27, 2026) — the proof the Accuracy page shows.
// RandomForest trained ONLY on real labeled landslide events, tested on
// future years it never saw. Numbers verified against
// workspace/ne_shield_v4/labeled_data/ne_landslide_labeled.csv and
// train_demo.py. Hand-maintained: update if the demo is re-run.

export interface DemoMiss {
  event: string;
  date: string;
  rain24: number;
  note: string;
  url: string;
}

export const DEMO_INFO = {
  name: 'RandomForest (200 trees, sklearn 1.9.1)',
  accuracyPct: 97.1,
  accuracyLabel: 'accuracy on unseen future years',
  eventsCaught: 138,
  eventsTotal: 140,
  falseAlarms: 6,
  totalRows: 1042,
  eventRows: 521,
  controlRows: 521,
  trainRows: 762,
  testRows: 280,
  trainDesc: 'years ≤ 2015',
  testDesc: 'years ≥ 2016 (model ne ye kabhi dekhe nahi)',
  featureSource: 'Open-Meteo Archive (ERA5), timezone Asia/Kolkata',
  robustness: '20–70% train splits: 96.7–97.8% — stable, lucky split nahi',
  verifyCommand: 'cd ~/workspace/ne_shield_v4/labeled_data && ~/mlenv/bin/python train_demo.py',
  featureImportance: {
    '30-day rainfall': 45.8,
    '3-day rainfall': 29.8,
    '24h rainfall': 19.8,
    'soil moisture': 4.6,
  } as Record<string, number>,
};

export const DEMO_METHOD: string[] = [
  'Model ko sirf 2015 tak ke data par train kiya gaya (762 rows) — test ke 280 rows (2016+) usne kabhi dekhe hi nahi. Ye honest temporal test hai, lucky split nahi.',
  'Har row: 24h / 3-day / 30-day baarish + soil moisture, Open-Meteo Archive (ERA5) se. 521 asli landslides (NASA Global Landslide Catalog + verified news) + 521 January controls.',
  'Verdict: event par landslide ka anumaan = HIT, choot gaya = MISS; control par koi alarm nahi = sahi, alarm = false alarm.',
  '20–70% train splits par score 96.7–97.8% raha — model stable hai, ek achche split ka kamaal nahi.',
];

export const DEMO_MISSES: DemoMiss[] = [
  {
    event: 'Mizoram Landslide near Zemabawk',
    date: '2018-05-12',
    rain24: 3.1,
    note: 'Baarish lagbhag zero thi (3.1 mm). Wahan kaaran insaani tha (cutting/construction), jo mausam-data me dikh hi nahi sakta — aur hum ye chhupate nahi, khule me batate hain.',
    url: 'http://morungexpress.com/4-bodies-recovered-from-mizoram-landslide/',
  },
  {
    event: 'Thuampui (Aizawl) Landslide',
    date: '2021-06-11',
    rain24: 13.2,
    note: 'Baarish bahut kam thi (13.2 mm). Insaani kaaran mausam-data se dikhta nahi — miss khule me sweekara hai.',
    url: 'https://nenow.in/north-east-news/mizoram/mizoram-orders-magisterial-probe-into-landslide-in-aizawl.html',
  },
];

export const DEMO_FALSE_ALARMS =
  '6 false alarms — sab 15 Jan 2016 ke asamanya geele dino par: 3 Sikkim me (Dzongu 47.3 mm, Legship 12.7 mm, Namchi 10.6 mm) aur 3 West Bengal me (NH-10 Coronation Bridge–Sevoke, Rangpo, Kalijhora — 12.7 mm). Early-warning system me false alarm, miss se sasta padta hai — ye caution hai, kami nahi.';

export const DEMO_HONEST_NOTE =
  'Purana V4 model 97.5% par tha, par wo formula se seekha tha (labels ek formula se bane the) — uski asli parakh 14 real cases par 57.1% thi, jo humne khud publish ki thi. Ye naya demo model 521 asli landslides se seekha hai: 97.1% unseen future years par. Dono numbers humne khud diye hain — progress chhupaya nahi, dikhaya hai.';
