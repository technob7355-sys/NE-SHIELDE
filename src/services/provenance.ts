/**
 * NE-SHIELD — Provenance Service (Data kahan se aaya, iska saboot)
 * =================================================================
 * Sawal: "Dashboard jo number dikha raha hai, wo REAL hai ya FAKE?"
 * Jawab is file se milega. Har live data ke saath ek "source stamp"
 * banta hai:
 *   - Data kis website/API se aaya (naam + pura URL, lat/lng ke saath)
 *   - Kab aaya (fetchedAtISO — asli fetch ka time)
 *   - API ne RAW kya bheja (baarish mm, mitti ki nami m3/m3 me)
 *   - Humne use % me kaise badla (conversion saaf dikhta hai)
 *   - Raw data ka ek chhota sa hash (angutha-nishan / fingerprint)
 *     — agar data baad me badla, hash badal jayega, pakda jayega.
 *
 * SABSE ZAROORI RULE: Data na aaye to isLive = false milega aur
 * error saaf likha hoga. Galat timestamp ya nakli "live" number
 * KABHI nahi banega. Bharosa jhooth se nahi, sach se banta hai.
 */

export interface Provenance {
  /** Data dene wale ka naam — jaise 'Open-Meteo API' */
  sourceName: string;
  /** Pura API URL (lat/lng ke saath) — koi bhi browser me khol ke check kar sakta hai */
  sourceUrl: string;
  /** Data kab liya gaya (ISO time). Fail hone par ye sirf "koshish ka time" hai, isLive=false ke saath */
  fetchedAtISO: string;
  /** Sach me live data aaya (true) ya nahi aaya (false) */
  isLive: boolean;
  /** Pichhle 24 ghante ki kul baarish (mm) — API se seedha */
  rawRainfallMm: number;
  /** Mitti ki nami RAW — API m3/m3 me deta hai (jaise 0.34). Ye convert NAHI hai */
  rawSoilRaw: number;
  /** Mitti ki nami % me — rawSoilRaw / 0.45 * 100 (yahi website par dikhta hai) */
  convertedSoilPct: number;
  /** API ne kul kitni hourly rows bheji (data kitna bada tha) */
  hourlyRowsCount: number;
  /** Raw JSON ka djb2 hash (hex) — data badla to ye bhi badlega */
  hash: string;
  /** Fail hone par wajah — success par khaali string */
  error: string;
  /** Pichhle 3 din ki kul baarish (mm) — audit ke liye extra */
  threeDayRainfallMm: number;
  /** Pichhle 30 din ki kul baarish (mm) — audit ke liye extra */
  antecedentRainfallMm: number;
}

/**
 * djb2 hash — ek simple "angutha-nishan" (fingerprint).
 * Same data = same hash, hamesha. Ek akshar bhi badla to hash badal jayega.
 * Ye security wala hash nahi hai — bas badlaav pakadne ke liye hai,
 * taaki audit JSON me likha data baad me chupke se badla na ja sake.
 */
export function djb2Hash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    // hash * 33 + akshar ka code
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Ek jagah (lat/lng) ka live data + uska pura saboot (provenance) lao.
 *
 * Ye wahi Open-Meteo call hai jo liveWeather.ts karta hai
 * (past_days=31, taaki 30 din ki baarish bhi nikal sake),
 * farak sirf itna hai: ye raw jawab ko phenkta nahi —
 * uska hash, time aur conversion — sab sambhal ke deta hai.
 *
 * Fail hone par throw NAHI karta. isLive:false + error deta hai,
 * taaki UI sach dikha sake: "Live data nahi mila".
 */
export async function fetchWithProvenance(lat: number, lng: number): Promise<Provenance> {
  const sourceUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&hourly=precipitation,soil_moisture_0_to_1cm` +
    `&past_days=31&forecast_days=0&timezone=Asia%2FKolkata`;

  // Koshish ka time — agar fail bhi ho to ye wahi time hai jab
  // koshish hui thi. Ise "live data ka time" bolke NAHI dikhayenge,
  // kyunki isLive=false saath me jayega.
  const attemptISO = new Date().toISOString();

  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) throw new Error(`Open-Meteo ne jawab diya: HTTP ${res.status}`);

    // Pehle raw text lo (hash isi par lagega), phir JSON banao
    const rawText = await res.text();
    const data = JSON.parse(rawText);

    const rainList: (number | null)[] = data?.hourly?.precipitation ?? [];
    const soilList: (number | null)[] = data?.hourly?.soil_moisture_0_to_1cm ?? [];
    if (rainList.length === 0) throw new Error('Open-Meteo se data khaali aaya');

    // Pichhle N ghante ki baarish jodo
    const sumLast = (list: (number | null)[], hours: number): number => {
      const slice = list.slice(-hours);
      let total = 0;
      for (const v of slice) if (v != null) total += v;
      return Math.round(total * 10) / 10;
    };

    const rawRainfallMm = sumLast(rainList, 24);
    const threeDayRainfallMm = sumLast(rainList, 72);
    const antecedentRainfallMm = sumLast(rainList, 24 * 30);

    // Mitti ki nami: pichhle 24 ghante ka average (RAW, m3/m3 me)
    const recentSoil = soilList.slice(-24).filter((v): v is number => v != null);
    let rawSoilRaw = 0;
    if (recentSoil.length > 0) {
      const avg = recentSoil.reduce((a, b) => a + b, 0) / recentSoil.length;
      rawSoilRaw = Math.round(avg * 1000) / 1000;
    }
    // Conversion saaf hai: 0.34 m3/m3 / 0.45 * 100 ≈ 76%
    // (0.45 = mitti me kul jagah ka andaz — Python script me bhi yahi hai)
    const convertedSoilPct = Math.min(100, Math.round((rawSoilRaw / 0.45) * 100));

    return {
      sourceName: 'Open-Meteo API (free weather data, bina key/login)',
      sourceUrl,
      fetchedAtISO: new Date().toISOString(), // asli fetch pura hone ka time
      isLive: true,
      rawRainfallMm,
      rawSoilRaw,
      convertedSoilPct,
      hourlyRowsCount: rainList.length,
      hash: djb2Hash(rawText),
      error: '',
      threeDayRainfallMm,
      antecedentRainfallMm,
    };
  } catch (err) {
    // FAIL = sach bolo. Nakli number / nakli time bilkul nahi.
    return {
      sourceName: 'Open-Meteo API (free weather data, bina key/login)',
      sourceUrl,
      fetchedAtISO: attemptISO,
      isLive: false,
      rawRainfallMm: 0,
      rawSoilRaw: 0,
      convertedSoilPct: 0,
      hourlyRowsCount: 0,
      hash: '',
      error: err instanceof Error ? err.message : 'Live data nahi mil paya',
      threeDayRainfallMm: 0,
      antecedentRainfallMm: 0,
    };
  }
}
