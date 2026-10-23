// NE-SHIELD V4 — live weather for one zone, from the Open-Meteo Forecast API.
//
// Note on soil depth: the historical archive pipeline (ml/) uses ERA5
// soil_moisture_0_to_7cm, while the forecast API exposes
// soil_moisture_0_to_1cm. Both are volumetric m3/m3 and use the same
// conversion as the training pipeline: pct = min(raw / 0.45 * 100, 100).
import type { ZoneLocation } from '../data/locations';

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
  fetchedAt: string;
  sourceUrl: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function fetchZoneWeather(loc: ZoneLocation): Promise<ZoneWeather> {
  const sourceUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}` +
    `&hourly=precipitation,soil_moisture_0_to_1cm&past_days=31&forecast_days=1` +
    `&timezone=Asia%2FKolkata`;
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Open-Meteo forecast failed for ${loc.id}: HTTP ${res.status}`);
  }
  const data = await res.json();
  const times: string[] = data.hourly.time;
  const precip: (number | null)[] = data.hourly.precipitation;
  const soilRaw: (number | null)[] = data.hourly.soil_moisture_0_to_1cm;

  // "Complete days" = full calendar days (Asia/Kolkata) strictly before
  // today. rainfall = the most recent complete day.
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const byDay = new Map<string, number>();
  times.forEach((t, i) => {
    const day = t.slice(0, 10);
    if (day >= todayStr) return; // skip today (incomplete) and forecast day
    byDay.set(day, (byDay.get(day) ?? 0) + (precip[i] ?? 0));
  });
  const days = [...byDay.keys()].sort();
  const lastDays = (n: number) =>
    days.slice(-n).reduce((sum, d) => sum + (byDay.get(d) ?? 0), 0);

  // Soil: average of the last 24 hourly values, converted to %.
  const recentSoil = soilRaw.slice(-24).filter((v): v is number => v != null);
  const soilAvg = recentSoil.length
    ? recentSoil.reduce((a, b) => a + b, 0) / recentSoil.length
    : 0;
  const soilMoisture = Math.min((soilAvg / 0.45) * 100, 100);

  return {
    zoneId: loc.id,
    rainfall: round1(lastDays(1)),
    rainfall3d: round1(lastDays(3)),
    rainfall30d: round1(lastDays(30)),
    soilMoisture: round1(soilMoisture),
    fetchedAt: new Date().toISOString(),
    sourceUrl,
  };
}
