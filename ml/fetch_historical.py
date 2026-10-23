# ============================================================
# NE-SHIELD V3 - Historical Dataset Builder
# ------------------------------------------------------------
# Ye script ASLI purani weather data laata hai:
#   Source: Open-Meteo Archive API (ERA5 reanalysis)
#   Period: har saal 1 June - 30 Sep (monsoon), 2018-2022
#   Zones : website ke 20 zones (src/data/mockData.ts wale)
#
# SOIL MOISTURE ke baare me imaandari (HONEST NOTE):
#   Humne archive API par hourly soil_moisture_0_to_7cm TRY kiya
#   (neeche probe code hai) aur ye ASLI me MILA: ERA5-Land
#   hourly values (unit m3/m3), har zone ke liye non-null.
#   Isliye is dataset me soil_moisture ASLI ERA5-Land value hai:
#       soil_moisture (%) = week ke aakhiri din ke 24 hourly
#                           volumetric values ka average x 100
#   (Example check, Mawsynram Jun-Sep 2022: 0.443-0.520 m3/m3.)
#   Sirf agar kisi zone-year ka hourly fetch fail ho jaye to
#   us row par PROXY fallback lagega aur 'soil_source' column
#   me 'proxy_fallback' likha aayega (warna 'era5_hourly_real').
#   Proxy formula (sirf fallback ke liye):
#       soil_proxy = clip(28 + 0.055*antecedent_30d
#                          + 0.08*three_day_rainfall, 20, 95)
#
# LABEL FORMULA (risk_score kaise bana - bilkul khula hisaab):
#   ISRO probability:
#       z = -3.817 + 0.077*DR + 0.058*3DCR + 0.009*30DAR
#       P = 1 / (1 + e^-z)
#   Score (V2 wale weights, taaki purane model se tulna ho sake):
#       score = min(DR/200,1)*28 + min(3DCR/500,1)*18
#             + min(30DAR/1200,1)*10 + (soil/100)*20
#             + (slope/48)*14 + (historical_risk/4)*10
#             + ISRO boost (P>0.95 par +3, P>0.85 par +1.5)
#       score ko 0-100 ke andar rakha gaya hai.
#   Level: 80+ Critical | 65+ High | 40+ Moderate | warna Low
#
# NOTE antecedent_30d: fetch 1 June se shuru hota hai, isliye
# season ki pehli weeks me 30-day total sirf utne din ka hai
# jitne din 1 June ke baad guzre hain (data hi utna hai).
#
# Chalana:  python3 fetch_historical.py
# Output:   ne_shield_historical_v3.csv + historical_raw/*.json
# ============================================================

import json
import math
import os
import time
import urllib.request
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(HERE, "historical_raw")
os.makedirs(RAW_DIR, exist_ok=True)

# 20 zones - src/data/mockData.ts se copy (id, name, state, lat, lng, slope, historical string)
ZONES = [
    ("rz-1", "NH-10 Mile 29, Sevoke-Rangpo", "Sikkim", 27.17, 88.52, 34, "Extreme"),
    ("rz-2", "Dzongu Valley Upper Slopes", "Sikkim", 27.53, 88.54, 41, "Extreme"),
    ("rz-3", "Cherrapunji (Sohra) Escarpment", "Meghalaya", 25.28, 91.73, 38, "Extreme"),
    ("rz-4", "NH-6 Sonapur Tunnel Corridor", "Meghalaya", 25.10, 92.35, 36, "Extreme"),
    ("rz-5", "Mangan District Headquarters Ridge", "Sikkim", 27.51, 88.53, 35, "High"),
    ("rz-6", "Sela Pass Approach (NH-13)", "Arunachal Pradesh", 27.50, 92.10, 44, "Extreme"),
    ("rz-7", "Haflong Hill Section (Dima Hasao)", "Assam", 25.17, 93.02, 31, "High"),
    ("rz-8", "Bhalukpong-Bomdila Trans-Himalayan Link", "Arunachal Pradesh", 27.01, 92.56, 37, "High"),
    ("rz-9", "Mawsynram Plateau Edge", "Meghalaya", 25.30, 91.58, 32, "High"),
    ("rz-10", "Singtam-Bermoik Flank", "Sikkim", 27.24, 88.50, 29, "Moderate"),
    ("rz-11", "Pasighat Foothill Slope", "Arunachal Pradesh", 28.07, 95.33, 33, "High"),
    ("rz-12", "Guwahati Naranarayan Slopes (Kamrup)", "Assam", 26.18, 91.75, 28, "Moderate"),
    ("rz-13", "Nongpoh Valley Escarpment", "Meghalaya", 25.90, 91.88, 27, "Moderate"),
    ("rz-14", "Roing-Mayodia Pass Ridge", "Arunachal Pradesh", 28.23, 95.84, 42, "High"),
    ("rz-15", "Cachar Barak Valley Escarpment", "Assam", 24.83, 92.80, 26, "Moderate"),
    ("rz-16", "Dawki Border Pass Slopes", "Meghalaya", 25.18, 92.02, 30, "Moderate"),
    ("rz-17", "Gangtok Ranipool Highway Spur", "Sikkim", 27.30, 88.60, 25, "Moderate"),
    ("rz-18", "Dirang River Valley Terrace", "Arunachal Pradesh", 27.35, 92.24, 22, "Low"),
    ("rz-19", "Karimganj South Hills", "Assam", 24.87, 92.35, 16, "Low"),
    ("rz-20", "Tezpur-Brahmaputra Bluff", "Assam", 26.63, 92.80, 12, "Low"),
]
HIST_NUM = {"Low": 1, "Moderate": 2, "High": 3, "Extreme": 4}


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "NE-SHIELD-V3 research"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def probe_soil_moisture(lat, lng):
    """Hourly soil moisture TRY karo - mila ya nahi, sach batao."""
    url = (
        "https://archive-api.open-meteo.com/v1/archive?"
        f"latitude={lat}&longitude={lng}&start_date=2022-06-01&end_date=2022-06-03"
        "&hourly=soil_moisture_0_to_7cm&timezone=Asia%2FKolkata"
    )
    try:
        data = fetch_json(url)
        vals = data.get("hourly", {}).get("soil_moisture_0_to_7cm", [])
        non_null = [v for v in vals if v is not None]
        print(f"  Soil-moisture probe: hourly values={len(vals)}, non-null={len(non_null)}")
        return len(non_null) > 0
    except Exception as e:
        print(f"  Soil-moisture probe FAILED: {e}")
        return False


def level_of(score):
    if score >= 80:
        return "Critical"
    if score >= 65:
        return "High"
    if score >= 40:
        return "Moderate"
    return "Low"


def label_score(rain, soil, slope, hist, three_day, antecedent):
    z = -3.817 + 0.077 * rain + 0.058 * three_day + 0.009 * antecedent
    p = 1 / (1 + math.exp(-z)) if z < 500 else 1.0
    score = (
        min(rain / 200, 1) * 28
        + min(three_day / 500, 1) * 18
        + min(antecedent / 1200, 1) * 10
        + (soil / 100) * 20
        + (slope / 48) * 14
        + (hist / 4) * 10
    )
    if p > 0.95:
        score += 3
    elif p > 0.85:
        score += 1.5
    return max(0.0, min(100.0, score))


def main():
    print("Soil moisture availability check (pehle zone par):")
    soil_real_available = probe_soil_moisture(ZONES[0][3], ZONES[0][4])
    print(f"  -> Real hourly soil moisture usable: {soil_real_available}")
    print("  -> ASLI ERA5 hourly soil use hoga; fail hone par hi proxy fallback.")

    rows = []
    for zid, name, state, lat, lng, slope, hist_str in ZONES:
        hist = HIST_NUM[hist_str]
        cache = os.path.join(RAW_DIR, f"{zid}.json")
        if os.path.exists(cache):
            with open(cache) as f:
                data = json.load(f)
            print(f"{zid} {name}: cache se liya")
        else:
            url = (
                "https://archive-api.open-meteo.com/v1/archive?"
                f"latitude={lat}&longitude={lng}"
                "&start_date=2018-06-01&end_date=2022-09-30"
                "&daily=precipitation_sum&timezone=Asia%2FKolkata"
            )
            data = fetch_json(url)
            with open(cache, "w") as f:
                json.dump(data, f)
            print(f"{zid} {name}: API se fetch kiya")
            time.sleep(0.3)

        times = data["daily"]["time"]
        precips = data["daily"]["precipitation_sum"]
        series = {}  # date -> mm (None ko 0 maano)
        for t, p in zip(times, precips):
            y, m, d = map(int, t.split("-"))
            series[date(y, m, d)] = float(p) if p is not None else 0.0

        # ASLI hourly soil moisture (ERA5-Land), har monsoon saal ke liye
        # soil_by_date[date] = us din ka average volumetric % (0-100)
        soil_by_date = {}
        for yr in (2018, 2019, 2020, 2021, 2022):
            scache = os.path.join(RAW_DIR, f"{zid}_soil_{yr}.json")
            try:
                if os.path.exists(scache):
                    with open(scache) as f:
                        sdata = json.load(f)
                else:
                    surl = (
                        "https://archive-api.open-meteo.com/v1/archive?"
                        f"latitude={lat}&longitude={lng}"
                        f"&start_date={yr}-06-01&end_date={yr}-09-30"
                        "&hourly=soil_moisture_0_to_7cm&timezone=Asia%2FKolkata"
                    )
                    sdata = fetch_json(surl)
                    with open(scache, "w") as f:
                        json.dump(sdata, f)
                    time.sleep(0.2)
                stimes = sdata["hourly"]["time"]
                svals = sdata["hourly"]["soil_moisture_0_to_7cm"]
                per_day = {}
                for t, v in zip(stimes, svals):
                    if v is None:
                        continue
                    per_day.setdefault(t[:10], []).append(float(v))
                for ds, vs in per_day.items():
                    yy, mm, dd = map(int, ds.split("-"))
                    soil_by_date[date(yy, mm, dd)] = (sum(vs) / len(vs)) * 100.0
            except Exception as e:
                print(f"  {zid} soil {yr} fetch fail ({e}) - un rows par proxy fallback")

        # ISO weeks me group karo (sirf Jun-Sep wale din)
        weeks = {}
        for dt in sorted(series):
            if dt.month not in (6, 7, 8, 9):
                continue
            iso = dt.isocalendar()
            key = (iso[0], iso[1])
            weeks.setdefault(key, []).append(dt)

        for (iso_year, iso_week), days in sorted(weeks.items()):
            week_end = max(days)
            week_start = week_end - timedelta(days=week_end.weekday())
            rain = series.get(week_end, 0.0)
            three_day = sum(series.get(week_end - timedelta(days=i), 0.0) for i in range(3))
            antecedent = sum(series.get(week_end - timedelta(days=i), 0.0) for i in range(30))
            # Soil: pehle ASLI ERA5 value; na mile to proxy fallback (column me flag)
            if week_end in soil_by_date:
                soil = soil_by_date[week_end]
                soil_src = "era5_hourly_real"
            else:
                soil = max(20.0, min(95.0, 28 + 0.055 * antecedent + 0.08 * three_day))
                soil_src = "proxy_fallback"
            score = label_score(rain, soil, slope, hist, three_day, antecedent)
            rows.append({
                "zone_id": zid, "zone": name, "state": state,
                "week_start": week_start.isoformat(), "year": week_end.year,
                "rainfall": round(rain, 1), "soil_moisture": round(soil, 1),
                "slope": slope, "historical_risk": hist,
                "three_day_rainfall": round(three_day, 1),
                "antecedent_30d": round(antecedent, 1),
                "risk_score": round(score, 1), "risk_level": level_of(score),
                "source": "archive_real_weather",
                "label_method": "isro_formula_thresholds_v3",
                "soil_source": soil_src,
            })

    out = os.path.join(HERE, "ne_shield_historical_v3.csv")
    import csv
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    from collections import Counter
    print(f"\nTotal rows: {len(rows)}")
    print("Years:", Counter(r["year"] for r in rows))
    print("Levels:", Counter(r["risk_level"] for r in rows))
    print("Soil source:", Counter(r["soil_source"] for r in rows))
    print(f"Saved: {out}")


if __name__ == "__main__":
    main()
