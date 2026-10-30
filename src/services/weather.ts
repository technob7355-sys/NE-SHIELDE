// NE-SHIELD V4 — live weather for one zone, from the Open-Meteo Forecast API.
//
// Note on soil depth: the historical archive pipeline (ml/) uses ERA5
// soil_moisture_0_to_7cm, while the forecast API exposes
// soil_moisture_0_to_1cm. Both are volumetric m3/m3 and use the same
// conversion as the training pipeline: pct = min(raw / 0.45 * 100, 100).
import type { ZoneLocation } from '../data/locations';

export interface DayRain {
  date: string; // YYYY-MM-DD
  rainfall: number; // mm that day
}

export interface ForecastDay {
  date: string; // YYYY-MM-DD
  rainfall: number; // forecast mm that day
  soilMoisture: number; // forecast avg soil moisture, % of saturation
}

export interface ZoneWeather {
  zoneId: string;
  /** Previous complete day's total rainfall (mm). */
  rainfall: number;
  /** Sum of the last 3 complete days (mm). */
  rainfall3d: number;
  /** Sum of the last 30 complete days (mm). */
  rainfall30d: number;
  /** Average soil moisture over the last 24 hours, % of saturation. */
  soilMoisture: number;
  /** Latest hourly temperature (°C). */
  currentTempC: number | null;
  /** Last 24 hourly rainfall values (mm), oldest → newest. */
  recentHourlyRain: number[];
  /** Past complete days, oldest → newest (for rolling the formula forward). */
  history: DayRain[];
  /** Next 3 calendar days (forecast). */
  forecast: ForecastDay[];
  fetchedAt: string;
  sourceUrl: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function fetchZoneWeather(loc: ZoneLocation): Promise<ZoneWeather> {
  const sourceUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}` +
    `&hourly=precipitation,soil_moisture_0_to_1cm,temperature_2m&past_days=31&forecast_days=4` +
    `&timezone=Asia%2FKolkata`;
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Open-Meteo forecast failed for ${loc.id}: HTTP ${res.status}`);
  }
  const data = await res.json();
  const times: string[] = data.hourly.time;
  const precip: (number | null)[] = data.hourly.precipitation;
  const soilRaw: (number | null)[] = data.hourly.soil_moisture_0_to_1cm;
  const tempRaw: (number | null)[] = data.hourly.temperature_2m ?? [];

  // "Complete days" = full calendar days (Asia/Kolkata) strictly before
  // today. rainfall = the most recent complete day. Today (incomplete) is
  // skipped; the 3 calendar days after today form the forecast.
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const pastByDay = new Map<string, number>();
  const fcstRain = new Map<string, number>();
  const fcstSoil = new Map<string, number[]>();
  times.forEach((t, i) => {
    const day = t.slice(0, 10);
    const p = precip[i] ?? 0;
    if (day < todayStr) {
      pastByDay.set(day, (pastByDay.get(day) ?? 0) + p);
    } else if (day > todayStr) {
      fcstRain.set(day, (fcstRain.get(day) ?? 0) + p);
      const s = soilRaw[i];
      if (s != null) {
        const arr = fcstSoil.get(day) ?? [];
        arr.push(s);
        fcstSoil.set(day, arr);
      }
    }
  });
  const pastDays = [...pastByDay.keys()].sort();
  const lastDays = (n: number) =>
    pastDays.slice(-n).reduce((sum, d) => sum + (pastByDay.get(d) ?? 0), 0);

  // Soil: average of the last 24 hourly values, converted to %.
  const recentSoil = soilRaw.slice(-24).filter((v): v is number => v != null);
  const soilAvg = recentSoil.length
    ? recentSoil.reduce((a, b) => a + b, 0) / recentSoil.length
    : 0;
  const soilMoisture = Math.min((soilAvg / 0.45) * 100, 100);

  const history: DayRain[] = pastDays
    .slice(-31)
    .map((d) => ({ date: d, rainfall: round1(pastByDay.get(d) ?? 0) }));
  const forecast: ForecastDay[] = [...fcstRain.keys()]
    .sort()
    .slice(0, 3)
    .map((d) => {
      const soils = fcstSoil.get(d) ?? [];
      const avg = soils.length ? soils.reduce((a, b) => a + b, 0) / soils.length : soilAvg;
      return {
        date: d,
        rainfall: round1(fcstRain.get(d) ?? 0),
        soilMoisture: round1(Math.min((avg / 0.45) * 100, 100)),
      };
    });

  return {
    zoneId: loc.id,
    rainfall: round1(lastDays(1)),
    rainfall3d: round1(lastDays(3)),
    rainfall30d: round1(lastDays(30)),
    soilMoisture: round1(soilMoisture),
    currentTempC:
      tempRaw.length > 0
        ? (() => {
            const valid = tempRaw.filter((v): v is number => v != null);
            return valid.length > 0 ? round1(valid[valid.length - 1]) : null;
          })()
        : null,
    recentHourlyRain: precip.slice(-24).map((v) => round1(v ?? 0)),
    history,
    forecast,
    fetchedAt: new Date().toISOString(),
    sourceUrl,
  };
}
