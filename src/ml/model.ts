// NE-SHIELD V4 — distilled TypeScript risk model.
//
// This implements EXACTLY the label formula defined in ml/formula.py /
// ml/train.py — the same formula that generated the training labels and that
// ml/backtest.py uses — so the live UI, the training data and the backtest
// all score identically. Verified against the Python implementation on
// sample inputs (see ml/README.md).
//
//   base = 100 * (0.30*min(rain/150,1) + 0.25*min(rain3d/350,1)
//               + 0.20*min(rain30d/1200,1) + 0.15*(soil/100)
//               + 0.10*min(slope/45,1))
//   P    = 1 / (1 + exp(-z)),
//          z = -3.817 + 0.0077*rain + 0.0058*rain3d + 0.0009*rain30d
//          (ISRO coefficients scaled x0.1; raw values saturate on cumulative
//          sums — see ml/formula.py header)
//   score = round(0.8*base + 20*P), capped 0..100
//   Levels: >=80 Critical, >=65 High, >=40 Moderate, else Low

export interface RiskInput {
  rainfall: number;
  rainfall3d: number;
  rainfall30d: number;
  soilMoisture: number;
  slope: number;
}

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface RiskBreakdownItem {
  label: string;
  points: number;
  max: number;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  breakdown: RiskBreakdownItem[];
}

export function levelOf(score: number): RiskLevel {
  if (score >= 80) return 'Critical';
  if (score >= 65) return 'High';
  if (score >= 40) return 'Moderate';
  return 'Low';
}

export function predictRisk(input: RiskInput): RiskResult {
  const rain24n = Math.min(input.rainfall / 150, 1);
  const rain3dn = Math.min(input.rainfall3d / 350, 1);
  const rain30dn = Math.min(input.rainfall30d / 1200, 1);
  const soiln = input.soilMoisture / 100;
  const slopen = Math.min(input.slope / 45, 1);

  const z =
    -3.817 + 0.0077 * input.rainfall + 0.0058 * input.rainfall3d + 0.0009 * input.rainfall30d;
  const p = 1 / (1 + Math.exp(-z));

  // Points are the exact (unrounded) component contributions; they sum to
  // 0.8*base + 20*P, i.e. to the score before rounding/capping.
  const breakdown: RiskBreakdownItem[] = [
    { label: 'Rainfall 24h', points: 0.8 * 100 * 0.3 * rain24n, max: 24 },
    { label: 'Rainfall 3-day', points: 0.8 * 100 * 0.25 * rain3dn, max: 20 },
    { label: 'Rainfall 30-day', points: 0.8 * 100 * 0.2 * rain30dn, max: 16 },
    { label: 'Soil moisture', points: 0.8 * 100 * 0.15 * soiln, max: 12 },
    { label: 'Slope', points: 0.8 * 100 * 0.1 * slopen, max: 8 },
    { label: 'ISRO probability boost', points: 20 * p, max: 20 },
  ];
  const total = breakdown.reduce((sum, b) => sum + b.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(total)));
  return { score, level: levelOf(score), breakdown };
}

// Mirrors ml/metrics.json (values filled in after training — see
// src/data/modelInfo.ts, which is the generated copy the UI reads).
export const MODEL_INFO = {
  version: 'V4',
  bestModel: 'GradientBoosting',
  mae: 0.73,
  r2: 0.99,
  levelAccuracy: 97.5,
  trainRows: 1060,
  testRows: 680,
  trainedOn: 'Open-Meteo Archive 2018-2022 monsoon (Jun-Sep), train ≤2020',
  featureImportance: {
    rainfall: 27.1,
    rainfall_3d: 52.2,
    rainfall_30d: 19.6,
    soil_moisture: 0.1,
    slope: 1.0,
  } as Record<string, number>,
};
