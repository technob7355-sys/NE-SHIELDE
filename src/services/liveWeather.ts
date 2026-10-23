/**
 * NE-SHIELD — Live Weather Service (Open-Meteo)
 * ==============================================
 * Ye service bilkul waisa hi kaam karti hai jaisa
 * Python wali fetch_live_data.py karti hai:
 *   - Koi API key / login nahi chahiye (Open-Meteo free hai)
 *   - Lat/Lng do -> live baarish + mitti ki nami milegi
 *   - Nami ko m3/m3 se % me badla jata hai ( / 0.45 * 100 )
 *
 * Extra (V2): ab 3-day aur 30-day kul baarish bhi nikalti hai,
 * taaki riskModel.ts ke 6 features pure ho jayein.
 */

export interface LiveWeather {
  /** Pichhle 24 ghante ki kul baarish (mm) */
  rainfall: number;
  /** Pichhle 3 din ki kul baarish (mm) */
  threeDayRainfall: number;
  /** Pichhle 30 din ki kul baarish (mm) — antecedent */
  antecedentRainfall: number;
  /** Mitti ki nami (0-100 %) */
  soilMoisture: number;
  /** Data kab liya gaya */
  fetchedAt: Date;
  /** Data aaya ya fallback use hua */
  source: 'open-meteo' | 'fallback';
}

/**
 * Ek jagah ka live weather lao.
 * @param lat Latitude (jaise 27.17)
 * @param lng Longitude (jaise 88.52)
 */
export async function fetchLiveWeather(lat: number, lng: number): Promise<LiveWeather> {
  // 30 din ka data chahiye isliye past_days=30 manga hai.
  // Hourly data aayega: precipitation + soil moisture.
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&hourly=precipitation,soil_moisture_0_to_1cm` +
    `&past_days=31&forecast_days=0&timezone=Asia%2FKolkata`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();

  const rainList: (number | null)[] = data?.hourly?.precipitation ?? [];
  const soilList: (number | null)[] = data?.hourly?.soil_moisture_0_to_1cm ?? [];
  if (rainList.length === 0) throw new Error('Open-Meteo se data khaali aaya');

  const sumLast = (list: (number | null)[], hours: number): number => {
    const slice = list.slice(-hours);
    let total = 0;
    for (const v of slice) if (v != null) total += v;
    return Math.round(total * 10) / 10;
  };

  const rainfall = sumLast(rainList, 24); // last 24 hours
  const threeDayRainfall = sumLast(rainList, 72); // last 3 days
  const antecedentRainfall = sumLast(rainList, 24 * 30); // last 30 days

  // Mitti ki nami: pichhle 24 ghante ka average lo,
  // phir Python wale formula se % me badlo (0.375/0.45*100 ≈ 83%)
  const recentSoil = soilList.slice(-24).filter((v): v is number => v != null);
  let soilMoisture = 50; // fallback agar soil data na mile
  if (recentSoil.length > 0) {
    const avg = recentSoil.reduce((a, b) => a + b, 0) / recentSoil.length;
    soilMoisture = Math.min(100, Math.round((avg / 0.45) * 100));
  }

  return {
    rainfall,
    threeDayRainfall,
    antecedentRainfall,
    soilMoisture,
    fetchedAt: new Date(),
    source: 'open-meteo',
  };
}

/**
 * Live weather + risk ek saath chahiye to component me:
 *   const w = await fetchLiveWeather(zone.lat, zone.lng);
 *   const r = predictRisk({ rainfall: w.rainfall, ... });
 * Yahan sirf weather rakha hai taaki service halki rahe.
 */
