/**
 * NE-SHIELD — Risk Model V3 (Browser Version / TypeScript)
 * =========================================================
 * V3, V2 se kaise alag hai?
 *   V2 synthetic (banaye hue) data par trained tha.
 *   V3 ASLI data par trained hai: Open-Meteo Archive ka
 *   2018-2022 monsoon weather, 20 zones, weekly rows (1820 rows).
 *   Soil moisture bhi asli ERA5-Land hourly value hai.
 *
 * Training ka tareeka (ml/train_model_v3.py):
 *   TEMPORAL split — Train: 2018-2020 | Test: 2021-2022
 *   (model ko future predict karna hota hai, isliye random
 *    shuffle split nahi kiya gaya)
 *   Best model: GradientBoosting (200 trees)
 *   Test MAE = 0.63 | R2 = 0.9922 | Level Accuracy = 98.1%
 *   Dhyaan do: labels formula-derived hain, isliye ye numbers
 *   "formula ko real weather par kitni achhi tarah reproduce
 *   kiya" batate hain. Asli duniya ki kasauti BACKTEST hai
 *   (BACKTEST_REPORT.md): 14 cases me 57.1% correct —
 *   7/7 dry-season controls sahi, lekin 7 asli ghatnaon me
 *   sirf 1 HIT. Model baarish ke local extreme aur insaani
 *   kaaran (pahad kaatna, drainage) nahi dekh pata. Imaandari
 *   ke liye ye baat yahin likh di hai.
 *
 * Ye file usi Python model ka distilled (chhota) version hai —
 * wahi formula jo V2 me thi, ek sudhaar ke saath:
 *
 *   SOIL CAP: Training data (asli ERA5) me soil moisture
 *   25.9% - 51.5% ke beech hi raha. Tree model is range ke
 *   bahar saturate ho jata hai (zyada soil = zyada points nahi).
 *   Isliye soil ke points 50% par cap kiye hain (training max
 *   51.5 ke andar). Isi ek
 *   badlaav se TS aur Python model ke LEVELS 5/5 verification
 *   samples par match karte hain (ml/verify script output
 *   parent report me hai).
 *
 * Score ka matlab: 80+ Critical | 65+ High | 40+ Moderate | warna Low
 * ISRO Formula: z = -3.817 + 0.077*DR + 0.058*3DCR + 0.009*30DAR
 */

export interface RiskInput {
  rainfall: number;
  soilMoisture: number;
  slope: number;
  historicalRisk: number | string;
  threeDayRainfall: number;
  antecedentRainfall: number;
}

export type SimpleLevel = 'Critical' | 'High' | 'Moderate' | 'Low';

export interface BreakdownItem {
  factor: string;
  points: number;
  maxPoints: number;
}

export interface RiskOutput {
  score: number;
  level: SimpleLevel;
  reasons: string[];
  isroProbability: number;
  breakdown: BreakdownItem[];
}

/** V3 model ki pehchaan aur asli test performance — UI isko dikha sakta hai */
export const modelMeta = {
  version: 'V3',
  trainedOn: 'Open-Meteo Archive 2018-2020 (monsoon)',
  testPeriod: '2021-2022',
  testMAE: 0.63,
  r2: 0.9922,
  levelAccuracy: 98.1,
};

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

/** ERA5 training range ke bahar soil ko cap karo (upar comment dekho) */
const SOIL_CAP = 50;

export function predictRiskV3(input: RiskInput): RiskOutput {
  const rainfall = Math.max(0, input.rainfall || 0);
  const soilRaw = clamp(input.soilMoisture || 0, 0, 100);
  const soilMoisture = Math.min(soilRaw, SOIL_CAP); // sirf points ke liye cap
  const slope = clamp(input.slope || 0, 0, 50);
  const history = historyToNumber(input.historicalRisk ?? 2);
  const threeDay = Math.max(0, input.threeDayRainfall || 0);
  const antecedent = Math.max(0, input.antecedentRainfall || 0);

  // Har factor ke points — V2 wale weights, soil capped
  const rainPoints = Math.min(rainfall / 200, 1) * 28;
  const threeDayPoints = Math.min(threeDay / 500, 1) * 18;
  const antecedentPoints = Math.min(antecedent / 1200, 1) * 10;
  const soilPoints = (soilMoisture / 100) * 20;
  const slopePoints = (slope / 48) * 14;
  const historyPoints = (history / 4) * 10;
  let score =
    rainPoints + threeDayPoints + antecedentPoints + soilPoints + slopePoints + historyPoints;

  // ISRO logistic formula se chhota boost (probability asli, uncapped inputs par)
  const z = -3.817 + 0.077 * rainfall + 0.058 * threeDay + 0.009 * antecedent;
  const isroProb = 1 / (1 + Math.exp(-z));
  let isroBoost = 0;
  if (isroProb > 0.95) isroBoost = 3;
  else if (isroProb > 0.85) isroBoost = 1.5;
  score += isroBoost;

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const breakdown: BreakdownItem[] = [
    { factor: 'Aaj ki baarish (Rainfall 24h)', points: round1(rainPoints), maxPoints: 28 },
    { factor: '3 din ki baarish (3-Day Rainfall)', points: round1(threeDayPoints), maxPoints: 18 },
    { factor: 'Mitti ki nami (Soil Moisture, ERA5 cap 50%)', points: round1(soilPoints), maxPoints: 20 },
    { factor: 'Dhalan (Slope)', points: round1(slopePoints), maxPoints: 14 },
    { factor: '30 din ki baarish (Antecedent Rain)', points: round1(antecedentPoints), maxPoints: 10 },
    { factor: 'Purana risk (Historical Risk)', points: round1(historyPoints), maxPoints: 10 },
  ];
  if (isroBoost > 0) {
    breakdown.push({ factor: 'ISRO formula boost', points: isroBoost, maxPoints: 3 });
  }

  score = Math.round(clamp(score, 0, 100));

  let level: SimpleLevel = 'Low';
  if (score >= 80) level = 'Critical';
  else if (score >= 65) level = 'High';
  else if (score >= 40) level = 'Moderate';

  const reasons: string[] = [];
  if (rainfall >= 120) reasons.push('Bahut tez baarish hui hai — Very heavy rain today, soil is loose.');
  else if (rainfall >= 80) reasons.push('Tez baarish hui hai — Heavy rain, pahad kamzor ho sakta hai.');
  else if (rainfall >= 40) reasons.push('Medium baarish hui hai — Moderate rain, dhyaan rakhein.');
  else reasons.push('Baarish kam hai — Less rain, is taraf se khatra kam hai.');
  if (threeDay >= 300) reasons.push('Pichhle 3 din se lagatar baarish — Rain for 3 days, mitti poori bheeg gayi hai.');
  else if (threeDay >= 150) reasons.push('Pichhle 3 din me achhi baarish — Soil is getting wet from inside.');
  if (antecedent >= 900) reasons.push('Is mahine bahut baarish ho chuki hai — This month already very wet, pahad thaka hua hai.');
  if (soilRaw >= 85) reasons.push('Mitti me bahut zyada nami hai — Soil is full of water, phisal sakti hai.');
  else if (soilRaw >= 70) reasons.push('Mitti geeli hai — Soil is wet, risk badh raha hai.');
  if (slope >= 35) reasons.push('Dhalan bahut tez hai — Very steep slope, mitti aasani se gir sakti hai.');
  else if (slope >= 28) reasons.push('Dhalan tez hai — Steep slope, sambhal ke chalein.');
  if (history >= 4) reasons.push('Yahan pehle bhi landslide hua hai — Landslide has happened here before.');
  else if (history === 3) reasons.push('Ye ilaaka pehle se risky mana jata hai — This area is known risky.');
  if (reasons.length === 0) reasons.push('Abhi sab cheezein normal hai — Everything looks normal right now.');

  return {
    score,
    level,
    reasons,
    isroProbability: Math.round(isroProb * 1000) / 10,
    breakdown,
  };
}

/** Alias — purane components predictRisk naam bhi use karte hain */
export const predictRisk = predictRiskV3;

export function scoreToLevel(score: number): SimpleLevel {
  if (score >= 80) return 'Critical';
  if (score >= 65) return 'High';
  if (score >= 40) return 'Moderate';
  return 'Low';
}
