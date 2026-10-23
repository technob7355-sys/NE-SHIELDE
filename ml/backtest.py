# ============================================================
# NE-SHIELD V3 - Real-Event Backtest (Asli Ghatnaon Par Test)
# ------------------------------------------------------------
# Sawal: kya V3 model (jo sirf <=2020 data par trained hai)
# ASLI 2021-2022 landslide ghatnaon ko pehle se High/Critical
# bol pata? Aur dry-season (January) me galat alarm to nahi deta?
#
# Tareeka (har case ke liye):
#   - Ghatna wale din se EK DIN PEHLE tak ke 31 din ka asli
#     Open-Meteo Archive weather lo (daily baarish + hourly
#     ERA5 soil moisture - bilkul waisa hi jaisa training me tha)
#   - rain24 = kal ki baarish, rain3d = pichhle 3 din,
#     rain30d = pichhle 30 din, soil = kal ka ERA5 average
#   - Trained V3 model se score/level nikalo
#   - Verdict: Event+High/Critical = HIT, Event+Low/Moderate = MISS
#              Control+Low/Moderate = CORRECT-REJECT,
#              Control+High/Critical = FALSE-ALARM
#
# Saari ghatnayein news/official sources se verify ki gayi hain
# (har case ke saath source URL diya hai). Jahan ghatna kisi
# zone me nahi hai, wahan slope/historical_risk SABSE PAAAS wale
# zone se liya hai aur code me saaf likha hai ki aisa kiya hai.
#
# Chalana: python3 backtest.py   (pehle train_model_v3.py chalao)
# Output : backtest_results.csv, ../BACKTEST_REPORT.md,
#          ../src/data/backtestData.ts
# ============================================================

import csv
import json
import math
import os
import urllib.request
from datetime import date, timedelta

import joblib
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
FEATURES = ["rainfall", "soil_moisture", "slope",
            "historical_risk", "three_day_rainfall", "antecedent_30d"]

# --- Verify ki hui ASLI ghatnayein (source URL ke saath) ---
# coords_type: 'zone' = zone ke coords, 'event' = ghatna-jagah ke approx coords
EVENTS = [
    dict(id="ev-tupul", name="Tupul Railway Station Landslide",
         location="Tupul, Noney District", state="Manipur", date="2022-06-30",
         lat=24.79, lng=93.68, coords_type="event place coords (approx)",
         slope=31, hist=3, slope_from="nearest zone rz-7 Haflong (slope 31, High)",
         source_url="https://www.thehindu.com/news/national/8-killed-72-missing-in-massive-landslide-in-manipur/article65586274.ece",
         source_title="8 killed, 45 missing in massive landslide in Manipur - The Hindu (30 Jun 2022)",
         outcome="Landslide hit Tupul railway construction camp on the night of 29-30 Jun 2022; dozens killed (56+ bodies later recovered)."),
    dict(id="ev-haflong", name="New Haflong Railway Station Landslides",
         location="New Haflong, Dima Hasao", state="Assam", date="2022-05-15",
         lat=25.17, lng=93.02, coords_type="zone rz-7 coords",
         slope=31, hist=3, slope_from="zone rz-7 Haflong itself",
         source_url="https://indianexpress.com/article/cities/guwahati/three-killed-as-rains-and-landslides-wreak-havoc-in-assam-air-force-called-in-7918493/",
         source_title="Three killed as rains and landslides wreak havoc in Assam - The Indian Express (16 May 2022)",
         outcome="11-18 May 2022 heavy rain triggered 1000s of landslides in Dima Hasao; New Haflong station buried by debris flows, a family of three killed in Haflong."),
    dict(id="ev-mawsynram", name="Kenmynsaw (Mawsynram) Landslide",
         location="Kenmynsaw village, near Mawsynram", state="Meghalaya", date="2022-06-17",
         lat=25.30, lng=91.58, coords_type="zone rz-9 coords (event village ~7 km from Mawsynram)",
         slope=32, hist=3, slope_from="zone rz-9 Mawsynram itself",
         source_url="https://amp.scroll.in/article/1026977/meghalayas-record-rainfall-triggers-devastating-landslides-and-flash-floods-leaving-34-dead",
         source_title="Meghalaya's record rainfall triggers devastating landslides and flash floods - Scroll.in (Jun 2022)",
         outcome="Record 1003.6 mm rain in 24h at Mawsynram (16-17 Jun 2022); landslide at Kenmynsaw killed an elderly couple; 34 dead across Meghalaya."),
    dict(id="ev-nh10", name="NH-10 Landslides (19/20 Mile, Singtam-Rangpo)",
         location="NH-10, between Singtam and Rangpo", state="Sikkim", date="2022-10-09",
         lat=27.17, lng=88.52, coords_type="zone rz-1 coords",
         slope=34, hist=4, slope_from="zone rz-1 NH-10 Mile 29 itself",
         source_url="https://www.moneycontrol.com/news/india/landslides-snap-road-connectivity-between-sikkim-and-west-bengal-9298281.html",
         source_title="Landslides snap road connectivity between Sikkim and West Bengal - Moneycontrol / PTI (9 Oct 2022)",
         outcome="Heavy rain triggered multiple landslides on 9 Oct 2022; NH-10 blocked at 19 Mile, 20 Mile and 32 Mile, cutting off Gangtok from West Bengal."),
    dict(id="ev-sonapur", name="Sonapur Tunnel Landslide (NH-6)",
         location="Sonapur Tunnel, East Jaintia Hills", state="Meghalaya", date="2022-06-29",
         lat=25.10, lng=92.35, coords_type="zone rz-4 coords",
         slope=36, hist=4, slope_from="zone rz-4 Sonapur itself",
         source_url="https://www.indiatodayne.in/meghalaya/story/meghalaya-vehicular-movement-restored-after-landslide-debris-cleared-sonapur-tunnel-east-jaintia-hills-district-418946-2022-06-29",
         source_title="Vehicular movement restored after landslide debris cleared at Sonapur Tunnel - India Today NE (29 Jun 2022)",
         outcome="Fresh landslide on 29 Jun 2022 turned NH-6 at Sonapur Tunnel into a river of mud and boulders, trapping vehicles for hours."),
    dict(id="ev-aizawl", name="Thuampui (Aizawl) Landslide",
         location="Thuampui, Aizawl", state="Mizoram", date="2021-06-11",
         lat=23.73, lng=92.72, coords_type="event place coords (approx)",
         slope=26, hist=2, slope_from="nearest zone rz-15 Cachar (slope 26, Moderate)",
         source_url="https://nenow.in/north-east-news/mizoram/mizoram-orders-magisterial-probe-into-landslide-in-aizawl.html",
         source_title="Mizoram orders magisterial probe into landslide in Aizawl - Northeast Now (15 Jun 2021)",
         outcome="Retaining wall collapsed in a landslide triggered by heavy rain on the night of 11 Jun 2021 at Thuampui, Aizawl; four children of one family killed."),
    dict(id="ev-yupia", name="Yupia (Papum Pare) Landslide",
         location="Yupia, Papum Pare District", state="Arunachal Pradesh", date="2022-06-19",
         lat=27.17, lng=93.72, coords_type="event place coords (approx)",
         slope=37, hist=3, slope_from="nearest zone rz-8 Bhalukpong-Bomdila (slope 37, High)",
         source_url="https://theprint.in/india/16-year-old-boy-killed-as-massive-landslide-hits-arunachals-papum-pare/1003044/",
         source_title="16-year-old boy killed as massive landslide hits Arunachal's Papum Pare - ThePrint / PTI (19 Jun 2022)",
         outcome="Massive landslide at Yupia on 19 Jun 2022 buried a 16-year-old boy; incessant rain had triggered landslides and floods across Arunachal Pradesh."),
]


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "NE-SHIELD-V3 backtest"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def weather_before(lat, lng, case_date):
    """Case date se 1 din pehle khatm hone wale 31 din ka asli weather."""
    end = case_date - timedelta(days=1)
    start = end - timedelta(days=30)
    base = "https://archive-api.open-meteo.com/v1/archive?"
    daily = fetch_json(base + f"latitude={lat}&longitude={lng}"
                       f"&start_date={start}&end_date={end}"
                       "&daily=precipitation_sum&timezone=Asia%2FKolkata")
    prec = [float(p) if p is not None else 0.0
            for p in daily["daily"]["precipitation_sum"]]
    hourly = fetch_json(base + f"latitude={lat}&longitude={lng}"
                        f"&start_date={start}&end_date={end}"
                        "&hourly=soil_moisture_0_to_7cm&timezone=Asia%2FKolkata")
    # Aakhiri din (kal) ke hourly soil ka average x 100 = soil %
    last_day = end.isoformat()
    soil_vals = [float(v) for t, v in zip(hourly["hourly"]["time"],
                                          hourly["hourly"]["soil_moisture_0_to_7cm"])
                 if t.startswith(last_day) and v is not None]
    soil = (sum(soil_vals) / len(soil_vals)) * 100 if soil_vals else 0.0
    return prec[-1], sum(prec[-3:]), sum(prec), soil


def level_of(score):
    if score >= 80:
        return "Critical"
    if score >= 65:
        return "High"
    if score >= 40:
        return "Moderate"
    return "Low"


# Har event ke liye case-specific imaandaar note (sources par based)
CASE_NOTES = {
    "ev-tupul": "Case note: GSI ki preliminary report ne Tupul ke liye extensive slope-cutting (railway station ke liye pahad kaatna), dumped construction debris aur improper drainage ko bada kaaran mana - ye cheezein model dekh hi nahi sakta. ERA5 grid (~10-25 km) par ghatna se ek din pehle ki baarish sirf 10.6mm aayi, jabki May-June me ilaake me record baarish ho chuki thi (rain30d=312mm) - maati andar se kamzor thi, lekin model ka score threshold tak nahi pahuncha.",
    "ev-haflong": "Case note: Research paper (Landslides journal, Roy et al.) ke mutabik Haflong me sabse zyada 24h baarish 156mm 11 May ko aayi thi aur ~200mm 4-din antecedent baarish ne landslides trigger kiye. Humne event date 15 May li (station bury hone ki khabar 14-16 May aayi); 14 May ki ERA5 daily baarish 31.6mm reh gayi - peak baarish 3-4 din pehle guzar chuki thi, isliye day-before features kamzor pad gaye. Ye timing/grid ka limitation hai.",
    "ev-nh10": "Case note: October (monsoon ke baad) ki ghatna hai - poore season ki baarish se pahad pehle se bheega tha (rain30d=249mm), lekin ghatna se ek din pehle ERA5 rain sirf 21.9mm dikha. Bade boulders girne wali ghatnayein aksar local kamzor rock + season-bhar ki saturation se hoti hain, jo daily grid rain me nahi dikhta.",
    "ev-sonapur": "Case note: Sabse paas wala MISS - score 48.7 (Moderate), High ke liye 65 chahiye tha. rain30d bahut zyada tha (1283mm - poora June bheega tha), lekin rain24 sirf 21.4mm tha; Sonapur tunnel par mudslide aksar upar ke saturated overburden ke behne se hota hai, jiska signal 24h rain me kamzor padta hai.",
    "ev-aizawl": "Case note: Mizoram ke mantri ne khud kaha tha ki ye ghatna shayad natural nahi, human negligence thi - upar ke construction site ki loose soil aur retaining wall ki khaami. Model aisi construction-quality wali wajah nahi dekh sakta; ERA5 rain bhi moderate tha (33.9mm).",
    "ev-yupia": "Case note: Dusra paas wala MISS - score 53.2 (Moderate). Rain asal me tez tha (rain24=57.5mm, rain3d=181mm), lekin model ka High threshold 65 isse upar nikal gaya. Yupia ke coords approx hain aur slope/history sabse paas wale zone (rz-8) se liya hai - jagah ka exact slope alag ho sakta hai.",
}


def explain(case_type, verdict, rain24, rain3d, rain30d):
    if verdict == "HIT":
        return (f"Model ne sahi pakda: ghatna se pehle rain24={rain24:.1f}mm, "
                f"rain3d={rain3d:.1f}mm, rain30d={rain30d:.1f}mm - maati pehle se bheegi thi.")
    if verdict == "MISS":
        return (f"Model chook gaya: rain24={rain24:.1f}mm, rain3d={rain3d:.1f}mm, rain30d={rain30d:.1f}mm "
                "model ko kam lage, lekin landslide ho gaya. Model sirf baarish/mitti/dhalan dekhta hai - "
                "sadak/rail ke liye pahad kaatna (slope cutting), kharab drainage, construction debris "
                "jaise insaani kaaran ye nahi dekh pata (Tupul par GSI ne slope-cutting ko bada kaaran mana tha).")
    if verdict == "CORRECT-REJECT":
        return "Dry season / kam baarish - model ne sahi kaha ki khatra kam hai, aur koi landslide report bhi nahi hua."
    return (f"Galat alarm: dry season me bhi model ne High/Critical bola (rain24={rain24:.1f}mm, "
            f"rain30d={rain30d:.1f}mm). Zyada slope / historical_risk ki wajah se score upar gaya hoga - "
            "yeh dikhata hai ki sirf slope+history kabhi-kabhi bina baarish ke bhi alarm utha dete hain.")


def main():
    model = joblib.load(os.path.join(HERE, "landslide_model_v3.pkl"))
    print("V3 model load ho gaya (trained on <=2020 only)")

    cases = []
    # Events + har event ke liye ek January control (same jagah, same saal)
    jobs = []
    for ev in EVENTS:
        jobs.append(("event", ev))
        yr = int(ev["date"][:4])
        ctrl = dict(ev)
        ctrl["id"] = "ctrl-" + ev["id"].split("-", 1)[1]
        ctrl["name"] = ev["name"] + " - January Control"
        ctrl["date"] = f"{yr}-01-15"
        ctrl["outcome"] = "No landslide reported (dry-season January control date)."
        jobs.append(("control", ctrl))

    for ctype, c in jobs:
        y, m, d = map(int, c["date"].split("-"))
        rain24, rain3d, rain30d, soil = weather_before(c["lat"], c["lng"], date(y, m, d))
        X = pd.DataFrame([{
            "rainfall": rain24, "soil_moisture": round(soil, 1), "slope": c["slope"],
            "historical_risk": c["hist"], "three_day_rainfall": rain3d,
            "antecedent_30d": rain30d,
        }], columns=FEATURES)
        score = float(model.predict(X)[0])
        score = max(0.0, min(100.0, score))
        level = level_of(score)
        high = level in ("High", "Critical")
        if ctype == "event":
            verdict = "HIT" if high else "MISS"
        else:
            verdict = "CORRECT-REJECT" if not high else "FALSE-ALARM"
        note = explain(ctype, verdict, rain24, rain3d, rain30d)
        if ctype == "event":
            if c["id"] in CASE_NOTES:
                note += " " + CASE_NOTES[c["id"]]
            note += f" [Coords: {c['coords_type']}; slope/history: {c['slope_from']}]"
        cases.append(dict(
            id=c["id"], type=ctype, name=c["name"], location=c["location"],
            state=c["state"], date=c["date"], sourceUrl=c["source_url"],
            sourceTitle=c["source_title"], rain24=round(rain24, 1),
            rain3d=round(rain3d, 1), rain30d=round(rain30d, 1),
            soilMoisture=round(soil, 1),
            modelScore=round(score, 1), modelLevel=level,
            actualOutcome=c["outcome"], verdict=verdict, note=note))
        print(f"{c['id']:16s} {c['date']} score={score:5.1f} {level:9s} -> {verdict}")

    total = len(cases)
    correct = sum(1 for c in cases if c["verdict"] in ("HIT", "CORRECT-REJECT"))
    evs = [c for c in cases if c["type"] == "event"]
    ctrls = [c for c in cases if c["type"] == "control"]
    ev_hits = sum(1 for c in evs if c["verdict"] == "HIT")
    ctrl_ok = sum(1 for c in ctrls if c["verdict"] == "CORRECT-REJECT")
    acc = correct / total * 100
    print(f"\nBACKTEST: {correct}/{total} correct = {acc:.1f}% | "
          f"Events HIT {ev_hits}/{len(evs)} | Controls correct {ctrl_ok}/{len(ctrls)}")

    # CSV
    with open(os.path.join(HERE, "backtest_results.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(cases[0].keys()))
        w.writeheader()
        w.writerows(cases)

    # Markdown report
    lines = [
        "# NE-SHIELD V3 - Real-Event Backtest Report",
        "",
        "**Sawal:** Kya V3 model (sirf 2018-2020 data par trained) asli 2021-2022 ki",
        "landslide ghatnaon ko ek din pehle ke weather se High/Critical bol pata hai?",
        "Aur January (dry season) me galat alarm to nahi deta?",
        "",
        f"**Result: {correct}/{total} correct = {acc:.1f}% accuracy** "
        f"(Events: {ev_hits}/{len(evs)} HIT, Controls: {ctrl_ok}/{len(ctrls)} correct-reject)",
        "",
        "Weather har case ke liye Open-Meteo Archive se liya gaya: ghatna se ek din",
        "pehle khatm hone wale 31 din (daily precipitation + ERA5 hourly soil moisture).",
        "Model ko 2021-2022 ka data training me kabhi nahi diya gaya tha.",
        "",
        "| Case | Type | Date | Rain24 | Rain3d | Rain30d | Model Score | Level | Actual Outcome | Verdict |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for c in cases:
        lines.append(f"| {c['name']} ({c['location']}, {c['state']}) | {c['type']} | {c['date']} | "
                     f"{c['rain24']} | {c['rain3d']} | {c['rain30d']} | {c['modelScore']} | "
                     f"{c['modelLevel']} | {c['actualOutcome']} | **{c['verdict']}** |")
    lines += ["", "## Sources (har ghatna yahan se verify hui)", ""]
    for c in evs:
        lines.append(f"- **{c['name']}** ({c['date']}): [{c['sourceTitle']}]({c['sourceUrl']})")
    lines += ["", "## Har MISS / FALSE-ALARM ki imaandaar wajah", ""]
    bad = [c for c in cases if c["verdict"] in ("MISS", "FALSE-ALARM")]
    if bad:
        for c in bad:
            lines.append(f"- **{c['name']} ({c['date']}) - {c['verdict']}:** {c['note']}")
    else:
        lines.append("Koi MISS ya FALSE-ALARM nahi aaya is run me.")
    lines += ["", "## Dhyaan dene wali baatein (Limitations)", "",
              "- Model sirf 6 cheezein dekhta hai: baarish, mitti ki nami, dhalan, purana risk, 3-din aur 30-din baarish.",
              "- Pahad kaatna (road/rail construction), drainage, aur geology model ko nahi dikhti - isliye kuch ghatnayein chook sakti hain.",
              "- Kuch ghatnaon ke coords approx hain aur slope/history sabse paas wale zone se liya hai (TS data me note me likha hai).",
              ""]
    with open(os.path.join(REPO, "BACKTEST_REPORT.md"), "w") as f:
        f.write("\n".join(lines))

    # TypeScript data file (UI track isko use karega)
    def ts_str(s):
        return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"
    ts = ["// NE-SHIELD V3 - Real-event backtest results (ml/backtest.py se generated)",
          "// Model: V3, trained only on 2018-2020 Open-Meteo Archive weather.",
          "// Har event news/official source se verify hai - sourceUrl dekho.",
          "",
          "export interface BacktestCase {",
          "  id: string; type: 'event' | 'control'; name: string; location: string;",
          "  state: string; date: string; sourceUrl: string; sourceTitle: string;",
          "  rain24: number; rain3d: number; rain30d: number;",
          "  modelScore: number; modelLevel: string; actualOutcome: string;",
          "  verdict: 'HIT' | 'MISS' | 'CORRECT-REJECT' | 'FALSE-ALARM'; note: string;",
          "}", "", "export const BACKTEST_CASES: BacktestCase[] = ["]
    for c in cases:
        ts.append("  { id: %s, type: %s, name: %s, location: %s, state: %s, date: %s,"
                  " sourceUrl: %s, sourceTitle: %s, rain24: %s, rain3d: %s, rain30d: %s,"
                  " modelScore: %s, modelLevel: %s, actualOutcome: %s, verdict: %s, note: %s },"
                  % (ts_str(c["id"]), ts_str(c["type"]), ts_str(c["name"]), ts_str(c["location"]),
                     ts_str(c["state"]), ts_str(c["date"]), ts_str(c["sourceUrl"]),
                     ts_str(c["sourceTitle"]), c["rain24"], c["rain3d"], c["rain30d"],
                     c["modelScore"], ts_str(c["modelLevel"]), ts_str(c["actualOutcome"]),
                     ts_str(c["verdict"]), ts_str(c["note"])))
    ts.append("];")
    ts.append("")
    ts.append("export const BACKTEST_SUMMARY = { total: %d, correct: %d, accuracyPct: %s, "
              "eventsTotal: %d, eventHits: %d, controlsTotal: %d, controlsCorrect: %d };"
              % (total, correct, round(acc, 1), len(evs), ev_hits, len(ctrls), ctrl_ok))
    with open(os.path.join(REPO, "src", "data", "backtestData.ts"), "w") as f:
        f.write("\n".join(ts) + "\n")
    print("Saved: backtest_results.csv, BACKTEST_REPORT.md, src/data/backtestData.ts")


if __name__ == "__main__":
    main()
