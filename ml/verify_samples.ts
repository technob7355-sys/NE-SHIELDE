// TS vs Python verification runner (node verify_samples.ts)
// 5 sample inputs par predictRiskV3 chalata hai, JSON print karta hai.
import { predictRiskV3, modelMeta } from '../src/ml/riskModelV3.ts';

const samples: Record<string, object> = {
  dry_low: { rainfall: 5, soilMoisture: 30, slope: 12, historicalRisk: 1, threeDayRainfall: 10, antecedentRainfall: 80 },
  moderate: { rainfall: 45, soilMoisture: 55, slope: 25, historicalRisk: 2, threeDayRainfall: 110, antecedentRainfall: 450 },
  high: { rainfall: 95, soilMoisture: 75, slope: 33, historicalRisk: 3, threeDayRainfall: 240, antecedentRainfall: 850 },
  nh10_critical: { rainfall: 142, soilMoisture: 87, slope: 34, historicalRisk: 4, threeDayRainfall: 315, antecedentRainfall: 1405 },
  cherrapunji_extreme: { rainfall: 188, soilMoisture: 91, slope: 38, historicalRisk: 4, threeDayRainfall: 393, antecedentRainfall: 1525 },
};

const out: Record<string, { score: number; level: string }> = {};
for (const [k, v] of Object.entries(samples)) {
  const r = predictRiskV3(v as never);
  out[k] = { score: r.score, level: r.level };
}
console.log(JSON.stringify({ meta: modelMeta, results: out }));
