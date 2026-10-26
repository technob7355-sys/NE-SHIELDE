// Presenter notes for the real-event backtest. These are documented analysis
// notes about each event (from the news reports and the GSI/official findings
// cited in the backtest), NOT model output — the model only sees weather.
export const BACKTEST_METHOD: string[] = [
  'Model ko sirf 2020 tak ke data par train kiya gaya — test ke events usne kabhi dekhe hi nahi.',
  'Har case ko uski date se pehle ke 31 din ke Open-Meteo Archive (ERA5) mausam se score kiya gaya.',
  'Har event ka ek January control bhi hai — wahi jagah, sukhe mausam me — taaki galat alarm pakde ja sakein.',
  'Verdict ka niyam: event ke din High/Critical aaye to HIT, usse neeche to MISS; control ke din Low aaye to CORRECT-REJECT, High/Critical aaye to FALSE-ALARM.',
]

export const EVENT_NOTES: Record<string, string> = {
  'Tupul Railway Station Landslide':
    'Event se ek din pehle grid par baarish sirf 12.5 mm thi. GSI ne slope-cutting aur drainage ko bhi kaaran bataya — ye cheezein mausam data me dikhti hi nahi.',
  'New Haflong Railway Station Landslides':
    'Sabse zyada baarish event se kuch din pehle gir chuki thi; event ke din grid par sirf 30.9 mm thi, isliye score Low raha.',
  'Kenmynsaw (Mawsynram) Landslide':
    'Record baarish — 24 ghante me 157.7 mm, 3 din me 329.7 mm — model ne ise Critical (82) par pakda. Yehi ek event HIT hua.',
  'NH-10 Landslides (19/20 Mile, Singtam-Rangpo)':
    'Event ke din grid par baarish mamuli thi (17.6 mm); local slope ki haalat satellite grid data me nahi aati.',
  'Sonapur Tunnel Landslide (NH-6)':
    'Score 45 (Moderate) tak pahuncha par High ki seema se neeche raha — 30-din ki baarish bahut zyada thi (1,283 mm) par haal ki baarish kam thi.',
  'Thuampui (Aizawl) Landslide':
    'Baarish mamuli thi (34.0 mm); jaanch me insaani laparwahi ki baat saamne aayi — mausam se ye kaaran model dekh hi nahi sakta.',
  'Yupia (Papum Pare) Landslide':
    'Score 50 (Moderate) — High se neeche raha; grid ki baarish exact jagah ki haalat se kam thi.',
}

export const CONTROL_NOTE = 'Sukha mausam, koi slide nahi — model ne sahi mana.'
