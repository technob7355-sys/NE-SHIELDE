#!/usr/bin/env python3
"""NE-SHIELD V4 — step 1: fetch real weather and build weekly feature rows.

ONE clean pipeline, API data ONLY (Open-Meteo Archive / ERA5). No ISRO files,
no synthetic rows, no old datasets.

For each of the 20 zones and each year 2018-2022 we fetch May 2 - Sep 30
(daily precipitation_sum + hourly soil_moisture_0_to_7cm, timezone
Asia/Kolkata) and cache the raw JSON under ml/raw/. We fetch from May 2 —
not Jun 1 — so that the 30-day antecedent rainfall for early-June weeks is
complete (30 full days available). Only weeks ending on a Sunday whose
week_end falls inside Jun 1 - Sep 30 are emitted.

Weekly row semantics (week ending Sunday S):
  rainfall     = precipitation on day S itself (mm)            ("last day")
  rainfall_3d  = sum of precipitation on S-2 .. S (mm)
  rainfall_30d = sum of precipitation on S-29 .. S (mm)
  soil_moisture= average soil moisture over the week S-6 .. S, in %.
                 ERA5 raw soil moisture is volumetric m3/m3. Conversion:
                 percent = min(raw_avg / 0.45 * 100, 100), where 0.45 m3/m3
                 is taken as the practical saturation point for these soils.

Output: ml/dataset_features.csv (features only). ml/train.py adds the
risk_score / risk_level label columns (formula in ml/formula.py) and writes
the final ml/dataset.csv.
"""
import csv
import json
import os
import time
import urllib.request
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(HERE, "raw")
os.makedirs(RAW_DIR, exist_ok=True)

ZONES = [
    ("rz-1", "Sikkim", 27.17, 88.52, 34),
    ("rz-2", "Sikkim", 27.53, 88.54, 41),
    ("rz-3", "Meghalaya", 25.28, 91.73, 38),
    ("rz-4", "Meghalaya", 25.10, 92.35, 36),
    ("rz-5", "Sikkim", 27.51, 88.53, 35),
    ("rz-6", "Arunachal Pradesh", 27.50, 92.10, 44),
    ("rz-7", "Assam", 25.17, 93.02, 31),
    ("rz-8", "Arunachal Pradesh", 27.01, 92.56, 37),
    ("rz-9", "Meghalaya", 25.30, 91.58, 32),
    ("rz-10", "Sikkim", 27.24, 88.50, 29),
    ("rz-11", "Arunachal Pradesh", 28.07, 95.33, 33),
    ("rz-12", "Assam", 26.18, 91.75, 28),
    ("rz-13", "Meghalaya", 25.90, 91.88, 27),
    ("rz-14", "Arunachal Pradesh", 28.23, 95.84, 42),
    ("rz-15", "Assam", 24.83, 92.80, 26),
    ("rz-16", "Meghalaya", 25.18, 92.02, 30),
    ("rz-17", "Sikkim", 27.30, 88.60, 25),
    ("rz-18", "Arunachal Pradesh", 27.35, 92.24, 22),
    ("rz-19", "Assam", 24.87, 92.35, 16),
    ("rz-20", "Assam", 26.63, 92.80, 12),
]

YEARS = [2018, 2019, 2020, 2021, 2022]
SOURCE = "Open-Meteo Archive (ERA5)"


def fetch_json(url, retries=3):
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "NE-SHIELD-V4 fetch"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    raise last


def fetch_chunk(zone_id, lat, lng, year):
    """One API call per zone-year (daily + hourly in a single response), cached."""
    cache = os.path.join(RAW_DIR, f"{zone_id}_{year}.json")
    if os.path.exists(cache):
        with open(cache) as f:
            return json.load(f)
    start = f"{year}-05-02"
    end = f"{year}-09-30"
    url = ("https://archive-api.open-meteo.com/v1/archive?"
           f"latitude={lat}&longitude={lng}&start_date={start}&end_date={end}"
           "&daily=precipitation_sum&hourly=soil_moisture_0_to_7cm"
           "&timezone=Asia%2FKolkata")
    data = fetch_json(url)
    with open(cache, "w") as f:
        json.dump(data, f)
    time.sleep(0.3)
    return data


def soil_pct(raw_avg):
    """ERA5 volumetric m3/m3 -> percent of saturation (0.45 = saturation)."""
    if raw_avg is None:
        return 0.0
    return min(raw_avg / 0.45 * 100.0, 100.0)


def build_rows():
    rows = []
    for zone_id, state, lat, lng, slope in ZONES:
        for year in YEARS:
            data = fetch_chunk(zone_id, lat, lng, year)
            daily = data["daily"]
            precip = {}
            for d, p in zip(daily["time"], daily["precipitation_sum"]):
                precip[d] = float(p) if p is not None else 0.0
            # daily average soil (raw m3/m3) from hourly values
            soil_by_day = {}
            hourly = data["hourly"]
            acc = {}
            for t, v in zip(hourly["time"], hourly["soil_moisture_0_to_7cm"]):
                if v is None:
                    continue
                day = t[:10]
                acc.setdefault(day, []).append(float(v))
            for day, vals in acc.items():
                soil_by_day[day] = sum(vals) / len(vals)

            jun1 = date(year, 6, 1)
            sep30 = date(year, 9, 30)
            # first Sunday on/after Jun 1
            d = jun1 + timedelta(days=(6 - jun1.weekday()) % 7)
            while d <= sep30:
                iso = d.isoformat()
                def rain_sum(days_back):
                    return sum(precip.get((d - timedelta(days=k)).isoformat(), 0.0)
                               for k in range(days_back))
                week_soils = [soil_by_day[(d - timedelta(days=k)).isoformat()]
                              for k in range(7)
                              if (d - timedelta(days=k)).isoformat() in soil_by_day]
                soil = soil_pct(sum(week_soils) / len(week_soils)) if week_soils else 0.0
                rows.append({
                    "zone": zone_id,
                    "state": state,
                    "week_end": iso,
                    "year": year,
                    "rainfall": round(precip.get(iso, 0.0), 1),
                    "rainfall_3d": round(rain_sum(3), 1),
                    "rainfall_30d": round(rain_sum(30), 1),
                    "soil_moisture": round(soil, 1),
                    "slope": slope,
                    "weather_source": SOURCE,
                })
                d += timedelta(days=7)
        print(f"{zone_id} done", flush=True)
    return rows


def main():
    rows = build_rows()
    out = os.path.join(HERE, "dataset_features.csv")
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["zone", "state", "week_end", "year",
                                          "rainfall", "rainfall_3d", "rainfall_30d",
                                          "soil_moisture", "slope", "weather_source"])
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {len(rows)} feature rows -> {out}")


if __name__ == "__main__":
    main()
