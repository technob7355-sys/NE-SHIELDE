#!/usr/bin/env python3
"""NE-SHIELD V4 — step 3: real-event backtest.

7 documented Northeast-India landslide events (names, dates, source URLs and
event coordinates copied from the verified V3 backtest:
~/workspace/ne_shield_v3/repo/ml/backtest_results.csv and its backtest.py)
+ 7 dry-season controls (same coordinates, 15 January of the event year).

For every case we fetch 31 days of Open-Meteo Archive (ERA5) weather ending
the day BEFORE the case date — regardless of season — and compute the same
features as the training pipeline. Each case is scored with the FORMULA model
(ml/formula.py) — the exact same formula the live UI uses via src/ml/model.ts
— so the backtest measures the deployed scoring logic, not an offline model.

Soil: archive hourly soil_moisture_0_to_7cm, averaged over the final day,
converted with the pipeline rule: pct = min(raw / 0.45 * 100, 100).
Slope: taken from the nearest V4 zone, exactly as V3 recorded it.

Verdicts: event HIT if score >= 65 else MISS;
          control CORRECT-REJECT if score < 65 else FALSE-ALARM.

Outputs: ml/backtest_results.csv and src/data/backtest.ts.
"""
import csv
import json
import os
import time
import urllib.request
from datetime import date, timedelta

from formula import level_of, risk_score

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
CACHE = os.path.join(HERE, "raw", "backtest")
os.makedirs(CACHE, exist_ok=True)

# name, location, state, date, lat, lng, slope (nearest zone, per V3), sourceUrl, sourceTitle
EVENTS = [
    ("Tupul Railway Station Landslide", "Tupul, Noney District", "Manipur",
     "2022-06-30", 24.79, 93.68, 31,
     "https://www.thehindu.com/news/national/8-killed-72-missing-in-massive-landslide-in-manipur/article65586274.ece",
     "8 killed, 45 missing in massive landslide in Manipur - The Hindu (30 Jun 2022)"),
    ("New Haflong Railway Station Landslides", "New Haflong, Dima Hasao", "Assam",
     "2022-05-15", 25.17, 93.02, 31,
     "https://indianexpress.com/article/cities/guwahati/three-killed-as-rains-and-landslides-wreak-havoc-in-assam-air-force-called-in-7918493/",
     "Three killed as rains and landslides wreak havoc in Assam - The Indian Express (16 May 2022)"),
    ("Kenmynsaw (Mawsynram) Landslide", "Kenmynsaw village, near Mawsynram", "Meghalaya",
     "2022-06-17", 25.30, 91.58, 32,
     "https://amp.scroll.in/article/1026977/meghalayas-record-rainfall-triggers-devastating-landslides-and-flash-floods-leaving-34-dead",
     "Meghalaya's record rainfall triggers devastating landslides and flash floods - Scroll.in (Jun 2022)"),
    ("NH-10 Landslides (19/20 Mile, Singtam-Rangpo)", "NH-10, between Singtam and Rangpo", "Sikkim",
     "2022-10-09", 27.17, 88.52, 34,
     "https://www.moneycontrol.com/news/india/landslides-snap-road-connectivity-between-sikkim-and-west-bengal-9298281.html",
     "Landslides snap road connectivity between Sikkim and West Bengal - Moneycontrol / PTI (9 Oct 2022)"),
    ("Sonapur Tunnel Landslide (NH-6)", "Sonapur Tunnel, East Jaintia Hills", "Meghalaya",
     "2022-06-29", 25.10, 92.35, 36,
     "https://www.indiatodayne.in/meghalaya/story/meghalaya-vehicular-movement-restored-after-landslide-debris-cleared-sonapur-tunnel-east-jaintia-hills-district-418946-2022-06-29",
     "Vehicular movement restored after landslide debris cleared at Sonapur Tunnel - India Today NE (29 Jun 2022)"),
    ("Thuampui (Aizawl) Landslide", "Thuampui, Aizawl", "Mizoram",
     "2021-06-11", 23.73, 92.72, 26,
     "https://nenow.in/north-east-news/mizoram/mizoram-orders-magisterial-probe-into-landslide-in-aizawl.html",
     "Mizoram orders magisterial probe into landslide in Aizawl - Northeast Now (15 Jun 2021)"),
    ("Yupia (Papum Pare) Landslide", "Yupia, Papum Pare District", "Arunachal Pradesh",
     "2022-06-19", 27.17, 93.72, 37,
     "https://theprint.in/india/16-year-old-boy-killed-as-massive-landslide-hits-arunachals-papum-pare/1003044/",
     "16-year-old boy killed as massive landslide hits Arunachal's Papum Pare - ThePrint / PTI (19 Jun 2022)"),
]


def fetch_json(url, retries=3):
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "NE-SHIELD-V4 backtest"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    raise last


def weather_before(lat, lng, case_date):
    """31 days of archive weather ending the day before case_date."""
    end = case_date - timedelta(days=1)
    start = end - timedelta(days=30)
    key = f"{lat}_{lng}_{start}_{end}".replace(".", "p").replace("-", "")
    cache = os.path.join(CACHE, key + ".json")
    if os.path.exists(cache):
        with open(cache) as f:
            data = json.load(f)
    else:
        url = ("https://archive-api.open-meteo.com/v1/archive?"
               f"latitude={lat}&longitude={lng}&start_date={start}&end_date={end}"
               "&daily=precipitation_sum&hourly=soil_moisture_0_to_7cm"
               "&timezone=Asia%2FKolkata")
        data = fetch_json(url)
        with open(cache, "w") as f:
            json.dump(data, f)
        time.sleep(0.3)
    prec = [float(p) if p is not None else 0.0
            for p in data["daily"]["precipitation_sum"]]
    last_day = end.isoformat()
    soil_vals = [float(v) for t, v in zip(data["hourly"]["time"],
                                          data["hourly"]["soil_moisture_0_to_7cm"])
                 if t.startswith(last_day) and v is not None]
    soil_raw = sum(soil_vals) / len(soil_vals) if soil_vals else 0.0
    soil = min(soil_raw / 0.45 * 100.0, 100.0)
    return prec[-1], sum(prec[-3:]), sum(prec), soil


def run_case(kind, name, location, case_date, lat, lng, slope, url, title):
    rain24, rain3d, rain30d, soil = weather_before(lat, lng, case_date)
    score = risk_score(rain24, rain3d, rain30d, soil, slope)
    level = level_of(score)
    if kind == "event":
        verdict = "HIT" if score >= 65 else "MISS"
        disp_name = name
    else:
        verdict = "CORRECT-REJECT" if score < 65 else "FALSE-ALARM"
        disp_name = name + " - January Control"
    return {
        "type": kind, "name": disp_name, "location": location,
        "date": case_date.isoformat(),
        "rain24": round(rain24, 1), "rain3d": round(rain3d, 1),
        "rain30d": round(rain30d, 1), "soil": round(soil, 1),
        "score": score, "level": level, "verdict": verdict,
        "sourceUrl": url, "sourceTitle": title,
    }


def main():
    cases = []
    for name, location, _state, dstr, lat, lng, slope, url, title in EVENTS:
        ev_date = date.fromisoformat(dstr)
        cases.append(run_case("event", name, location, ev_date, lat, lng, slope, url, title))
        ctrl_date = date(ev_date.year, 1, 15)
        cases.append(run_case("control", name, location, ctrl_date, lat, lng, slope, url, title))
        print(f"{name}: event + control done", flush=True)

    fields = ["type", "name", "location", "date", "rain24", "rain3d", "rain30d",
              "soil", "score", "level", "verdict", "sourceUrl", "sourceTitle"]
    with open(os.path.join(HERE, "backtest_results.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(cases)

    correct = sum(1 for c in cases if c["verdict"] in ("HIT", "CORRECT-REJECT"))
    accuracy = round(100.0 * correct / len(cases), 1)
    print(f"\nBacktest: {correct}/{len(cases)} correct -> accuracy {accuracy}%")
    for c in cases:
        print(f"  {c['type']:7s} {c['date']}  score={c['score']:3d} {c['level']:8s} "
              f"{c['verdict']:14s} {c['name']}")

    # --- generate src/data/backtest.ts ---
    def ts_str(s):
        return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"

    lines = [
        "// GENERATED by ml/backtest.py — do not edit by hand.",
        "// Real documented landslide events + dry-season (January) controls,",
        "// scored with the same formula as src/ml/model.ts on Open-Meteo",
        "// Archive (ERA5) weather from the 31 days before each case date.",
        "export interface BacktestCase {",
        "  type: 'event' | 'control';",
        "  name: string;",
        "  location: string;",
        "  date: string;",
        "  rain24: number;",
        "  rain3d: number;",
        "  rain30d: number;",
        "  soil: number;",
        "  score: number;",
        "  level: 'Low' | 'Moderate' | 'High' | 'Critical';",
        "  verdict: 'HIT' | 'MISS' | 'CORRECT-REJECT' | 'FALSE-ALARM';",
        "  sourceUrl: string;",
        "  sourceTitle: string;",
        "}",
        "",
        "export const BACKTEST_CASES: BacktestCase[] = [",
    ]
    for c in cases:
        lines.append(
            "  { type: %s, name: %s, location: %s, date: %s, rain24: %s, "
            "rain3d: %s, rain30d: %s, soil: %s, score: %d, level: %s, "
            "verdict: %s, sourceUrl: %s, sourceTitle: %s }," % (
                ts_str(c["type"]), ts_str(c["name"]), ts_str(c["location"]),
                ts_str(c["date"]), c["rain24"], c["rain3d"], c["rain30d"],
                c["soil"], c["score"], ts_str(c["level"]), ts_str(c["verdict"]),
                ts_str(c["sourceUrl"]), ts_str(c["sourceTitle"])))
    lines += [
        "];",
        "",
        f"export const BACKTEST_ACCURACY: number = {accuracy};",
        "",
    ]
    out = os.path.join(REPO, "src", "data", "backtest.ts")
    with open(out, "w") as f:
        f.write("\n".join(lines))
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
