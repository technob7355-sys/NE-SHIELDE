/**
 * NE-SHIELD — Risk Model V2 (Browser Version / TypeScript)
 * =========================================================
 * Ye file Python wale bade model (train_model_v2.py) ka
 * chhota, distilled version hai jo seedha browser me chalta hai.
 * Koi Python server nahi chahiye — website khud risk bata degi.
 *
 * Python Model V2 ki asli performance (620 rows par test):
 *   Best Model : GradientBoosting (200 trees)
 *   MAE = 3.74 points | R2 = 0.9543 | CV MAE = 3.50
 *   RandomForest: MAE = 3.96 | R2 = 0.9458 | CV MAE = 3.63
 *
 * Feature Importance (GradientBoosting se):
 *   rainfall 74.18% | three_day_rainfall 9.68% | soil_moisture 7.60%
 *   antecedent_30d 4.76% | slope 2.83% | historical_risk 0.96%
 *   Note: rainfall ka % itna zyada isliye hai kyunki 3-day aur
 *   30-day baarish bhi baarish se hi judi hai (collinearity).
 *   Isliye neeche wali formula me humne data banane wale
 *   asli weights use kiye hain — wahi formula jo synthetic
 *   data aur ISRO science ko sabse achhe se samjhata hai,
 *   aur jo Python model ke jawab ke sabse paas aata hai.
 *
 * ISRO Formula (Landslide Atlas 2023):
 *   z = -3.817 + 0.077*DR + 0.058*3DCR + 0.009*30DAR
 *   Ye bhi neeche use hua hai (chhota boost ke roop me).
 *
 * Score ka matlab (website wala purana rule hi hai):
 *   80-100 = Critical | 65-79 = High | 40-64 = Moderate | 0-39 = Low
 */

export interface RiskInput {
  /** Aaj / 24 ghante ki baarish (mm) */
  rainfall: number;
  /** Mitti me nami (0-100 %) */
  soilMoisture: number;
  /** Dhalan (degrees, 0-50) */
  slope: number;
  /** Purana risk: number 1-4 (Low=1, Moderate=2, High=3, Extreme=4)
   *  ya string 'Low' | 'Moderate' | 'High' | 'Extreme' — dono chalega */
  historicalRisk: number | string;
  /** Pichhle 3 din ki kul baarish (mm) */
  threeDayRainfall: number;
  /** Pichhle 30 din ki kul baarish (mm) */
  antecedentRainfall: number;
}

export type SimpleLevel = 'Critical' | 'High' | 'Moderate' | 'Low';

/** Ek factor ne score me kitne number diye — khula hisaab ke liye */
export interface BreakdownItem {
  /** Factor ka naam (aasan Hinglish + English) */
  factor: string;
  /** Is factor se mile number */
  points: number;
  /** Is factor se zyada-se-zyada kitne number mil sakte hain */
  maxPoints: number;
}

export interface RiskOutput {
  /** 0-100 risk score */
  score: number;
  /** Risk level */
  level: SimpleLevel;
  /** Aasan bhasha me wajah — aam aadmi ke liye, jargon nahi */
  reasons: string[];
  /** ISRO formula ki probability (0-100 %) — expert ke liye */
  isroProbability: number;
  /**
   * Khula hisaab: har factor ke points ki list.
   * PredictionAudit isi ko bar chart me dikhata hai —
   * taaki koi bhi dekh sake number aaya kahan se. Black box nahi.
   */
  breakdown: BreakdownItem[];
}

/** Historical risk ko number (1-4) me badlo */
function historyToNumber(h: number | string): number {
  if (typeof h === 'number') return Math.min(4, Math.max(1, h));
  const map: Record<string, number> = {
    low: 1,
    moderate: 2,
    high: 3,
    extreme: 4,
    critical: 4,
  };
  return map[h.toLowerCase()] ?? 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Risk predict karo — bina server ke, seedha browser me.
 *
 * @example
 * const r = predictRisk({
 *   rainfall: 142, soilMoisture: 87, slope: 34,
 *   historicalRisk: 4, threeDayRainfall: 315, antecedentRainfall: 1405,
 * });
 * // r.score ≈ 82, r.level = 'Critical'
 */
export function predictRisk(input: RiskInput): RiskOutput {
  const rainfall = Math.max(0, input.rainfall || 0);
  const soilMoisture = clamp(input.soilMoisture || 0, 0, 100);
  const slope = clamp(input.slope || 0, 0, 50);
  const history = historyToNumber(input.historicalRisk ?? 2);
  const threeDay = Math.max(0, input.threeDayRainfall || 0);
  const antecedent = Math.max(0, input.antecedentRainfall || 0);

  // --- Step 1: Har cheez ka hissa jodo (distilled formula) ---
  // Ye weights train_model_v2.py ke data-generation weights hain,
  // jinpar Python model train hua hai.
  // Har hissa alag variable me rakha hai taaki breakdown (khula
  // hisaab) me wahi number dikha sakein jo score me juda hai.
  const rainPoints = Math.min(rainfall / 200, 1) * 28; // aaj ki baarish — sabse bada hissa
  const threeDayPoints = Math.min(threeDay / 500, 1) * 18; // 3 din ki baarish
  const antecedentPoints = Math.min(antecedent / 1200, 1) * 10; // 30 din ki baarish
  const soilPoints = (soilMoisture / 100) * 20; // mitti ki nami
  const slopePoints = (slope / 48) * 14; // dhalan
  const historyPoints = (history / 4) * 10; // purana risk
  let score =
    rainPoints + threeDayPoints + antecedentPoints + soilPoints + slopePoints + historyPoints;

  // --- Step 2: ISRO logistic formula se chhota boost ---
  // z bada matlab maati pehle se hi bahut bheegi hui hai
  const z = -3.817 + 0.077 * rainfall + 0.058 * threeDay + 0.009 * antecedent;
  const isroProb = 1 / (1 + Math.exp(-z)); // 0 se 1
  let isroBoost = 0;
  if (isroProb > 0.95) isroBoost = 3;
  else if (isroProb > 0.85) isroBoost = 1.5;
  score += isroBoost;

  // --- Step 2b: Khula hisaab (breakdown) taiyaar karo ---
  // Points ko 1 decimal tak round kiya hai, isliye inka total
  // final score se ±1 idhar-udhar ho sakta hai (rounding ki wajah se).
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const breakdown: BreakdownItem[] = [
    { factor: 'Aaj ki baarish (Rainfall 24h)', points: round1(rainPoints), maxPoints: 28 },
    { factor: '3 din ki baarish (3-Day Rainfall)', points: round1(threeDayPoints), maxPoints: 18 },
    { factor: 'Mitti ki nami (Soil Moisture)', points: round1(soilPoints), maxPoints: 20 },
    { factor: 'Dhalan (Slope)', points: round1(slopePoints), maxPoints: 14 },
    { factor: '30 din ki baarish (Antecedent Rain)', points: round1(antecedentPoints), maxPoints: 10 },
    { factor: 'Purana risk (Historical Risk)', points: round1(historyPoints), maxPoints: 10 },
  ];
  if (isroBoost > 0) {
    breakdown.push({ factor: 'ISRO formula boost', points: isroBoost, maxPoints: 3 });
  }

  score = Math.round(clamp(score, 0, 100));

  // --- Step 3: Score ko level me badlo ---
  let level: SimpleLevel = 'Low';
  if (score >= 80) level = 'Critical';
  else if (score >= 65) level = 'High';
  else if (score >= 40) level = 'Moderate';

  // --- Step 4: Aasan bhasha me wajah banao ---
  // Koi technical shabd nahi. Gaon wala / driver bhi samjhe.
  const reasons: string[] = [];
  if (rainfall >= 120) reasons.push('Bahut tez baarish hui hai — Very heavy rain today, soil is loose.');
  else if (rainfall >= 80) reasons.push('Tez baarish hui hai — Heavy rain, pahad kamzor ho sakta hai.');
  else if (rainfall >= 40) reasons.push('Medium baarish hui hai — Moderate rain, dhyaan rakhein.');
  else reasons.push('Baarish kam hai — Less rain, is taraf se khatra kam hai.');

  if (threeDay >= 300) reasons.push('Pichhle 3 din se lagatar baarish — Rain for 3 days, mitti poori bheeg gayi hai.');
  else if (threeDay >= 150) reasons.push('Pichhle 3 din me achhi baarish — Soil is getting wet from inside.');

  if (antecedent >= 900) reasons.push('Is mahine bahut baarish ho chuki hai — This month already very wet, pahad thaka hua hai.');
  if (soilMoisture >= 85) reasons.push('Mitti me bahut zyada nami hai — Soil is full of water, phisal sakti hai.');
  else if (soilMoisture >= 70) reasons.push('Mitti geeli hai — Soil is wet, risk badh raha hai.');
  if (slope >= 35) reasons.push('Dhalan bahut tez hai — Very steep slope, mitti aasani se gir sakti hai.');
  else if (slope >= 28) reasons.push('Dhalan tez hai — Steep slope, sambhal ke chalein.');
  if (history >= 4) reasons.push('Yahan pehle bhi landslide hua hai — Landslide has happened here before.');
  else if (history === 3) reasons.push('Ye ilaaka pehle se risky mana jata hai — This area is known risky.');

  if (reasons.length === 0) {
    reasons.push('Abhi sab cheezein normal hai — Everything looks normal right now.');
  }

  return {
    score,
    level,
    reasons,
    isroProbability: Math.round(isroProb * 1000) / 10,
    breakdown,
  };
}

/** Score se sirf level chahiye to ye use karo */
export function scoreToLevel(score: number): SimpleLevel {
  if (score >= 80) return 'Critical';
  if (score >= 65) return 'High';
  if (score >= 40) return 'Moderate';
  return 'Low';
}
