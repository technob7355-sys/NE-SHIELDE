import React, { useState, useEffect } from 'react';
import { RiskZone, RiskLevel } from '../types';
import { X, ShieldAlert, Sparkles, Sliders, Info, CheckCircle2, RotateCcw, Satellite, Calculator } from 'lucide-react';
import { computeIsroEarlyWarning, getIsroDistrictRank } from '../data/isroLandslideAtlas';

interface AiRiskScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialZone?: RiskZone | null;
}

export const AiRiskScoreModal: React.FC<AiRiskScoreModalProps> = ({
  isOpen,
  onClose,
  initialZone,
}) => {
  // Evaluation Engine Mode: 'geotech' or 'isro'
  const [modelEngine, setModelEngine] = useState<'geotech' | 'isro'>('geotech');

  // Input parameters (Geotechnical Multi-Factor)
  const [rainfall, setRainfall] = useState<number>(142); // mm / 24h
  const [soilMoisture, setSoilMoisture] = useState<number>(87); // %
  const [slope, setSlope] = useState<number>(34); // degrees
  const [historicalRisk, setHistoricalRisk] = useState<'Low' | 'Moderate' | 'High' | 'Extreme'>('Extreme');
  const [selectedPresetName, setSelectedPresetName] = useState<string>('NH-10, Sikkim');

  // ISRO / NRSC Logistic Regression parameters (Page 83)
  const [threeDayRainfall, setThreeDayRainfall] = useState<number>(275);
  const [thirtyDayRainfall, setThirtyDayRainfall] = useState<number>(510);
  const [susceptibilityClass, setSusceptibilityClass] = useState<'Moderate' | 'High' | 'Very High' | 'Severe'>('Severe');

  useEffect(() => {
    if (initialZone) {
      setRainfall(initialZone.rainfall);
      setSoilMoisture(initialZone.soilMoisture);
      setSlope(initialZone.slope);
      setHistoricalRisk(initialZone.historicalRisk);
      setSelectedPresetName(initialZone.name);

      // Ingest ISRO parameters if available or compute realistic priors
      if (initialZone.threeDayCumulativeRainfall) {
        setThreeDayRainfall(initialZone.threeDayCumulativeRainfall);
      } else {
        setThreeDayRainfall(Math.round(initialZone.rainfall * 2.2));
      }
      if (initialZone.thirtyDayAntecedentRainfall) {
        setThirtyDayRainfall(initialZone.thirtyDayAntecedentRainfall);
      } else {
        setThirtyDayRainfall(Math.round(initialZone.rainfall * 4.2 + 80));
      }
      if (initialZone.riskLevel === 'Critical') {
        setSusceptibilityClass('Severe');
      } else if (initialZone.riskLevel === 'High') {
        setSusceptibilityClass('Very High');
      } else if (initialZone.riskLevel === 'Moderate') {
        setSusceptibilityClass('High');
      } else {
        setSusceptibilityClass('Moderate');
      }
    }
  }, [initialZone]);

  if (!isOpen) return null;

  // ISRO National District Rank lookup
  const currentDistrictRank = getIsroDistrictRank(
    initialZone?.district || initialZone?.name.split(' ')[0] || selectedPresetName.split(' ')[0],
    initialZone?.state
  );

  // 1. Geotechnical Multi-factor computation
  const calcRainfallFactor = Math.min(100, Math.round((rainfall / 160) * 100));
  const calcSoilFactor = Math.min(100, soilMoisture);
  const calcSlopeFactor = Math.min(100, Math.round((slope / 45) * 100));
  const calcHistoricalFactor =
    historicalRisk === 'Extreme' ? 100 : historicalRisk === 'High' ? 80 : historicalRisk === 'Moderate' ? 50 : 20;

  const weightedRainfall = calcRainfallFactor * 0.35;
  const weightedSoil = calcSoilFactor * 0.25;
  const weightedSlope = calcSlopeFactor * 0.25;
  const weightedHistorical = calcHistoricalFactor * 0.15;

  const rawGeotechScore = Math.round(weightedRainfall + weightedSoil + weightedSlope + weightedHistorical);
  const geotechRiskScore = Math.min(100, Math.max(0, rawGeotechScore));

  // 2. ISRO / NRSC Logistic Regression Computation: z = -3.817 + 0.077*DR + 0.058*3DCR + 0.009*30DAR
  const isroResult = computeIsroEarlyWarning(
    rainfall,
    threeDayRainfall,
    thirtyDayRainfall,
    susceptibilityClass
  );

  // Final score depending on selected model engine
  const activeScore = modelEngine === 'isro' ? Math.round(isroResult.triggerPercentage) : geotechRiskScore;

  let riskLevel: RiskLevel = 'Low';
  let levelColor = '#22c55e';
  let levelBg = 'bg-green-950/80 text-green-300 border-green-800/60';

  if (activeScore >= 80) {
    riskLevel = 'Critical';
    levelColor = '#ef4444';
    levelBg = 'bg-red-950/80 text-red-300 border-red-800/60';
  } else if (activeScore >= 60) {
    riskLevel = 'High';
    levelColor = '#f97316';
    levelBg = 'bg-orange-950/80 text-orange-300 border-orange-800/60';
  } else if (activeScore >= 30) {
    riskLevel = 'Moderate';
    levelColor = '#eab308';
    levelBg = 'bg-yellow-950/80 text-yellow-300 border-yellow-800/60';
  }

  // Why explanation generator
  const whyFactors: string[] = [];
  if (modelEngine === 'isro') {
    whyFactors.push(`Daily Rain ${rainfall}mm (0.077 weight)`);
    whyFactors.push(`3-Day Cumulative ${threeDayRainfall}mm (0.058 weight)`);
    whyFactors.push(`30-Day Saturation ${thirtyDayRainfall}mm (0.009 weight)`);
    whyFactors.push(`Susceptibility: ${susceptibilityClass}`);
  } else {
    if (rainfall >= 100) whyFactors.push('Heavy rainfall (35%)');
    else if (rainfall >= 50) whyFactors.push('Moderate rainfall (35%)');
    else whyFactors.push('Low rainfall (35%)');

    if (soilMoisture >= 80) whyFactors.push('High soil moisture (25%)');
    else if (soilMoisture >= 50) whyFactors.push('Moderate soil moisture (25%)');
    else whyFactors.push('Dry soil conditions (25%)');

    if (slope >= 30) whyFactors.push('Steep slope (25%)');
    else if (slope >= 20) whyFactors.push('Moderate slope (25%)');
    else whyFactors.push('Gentle gradient (25%)');

    if (historicalRisk === 'Extreme' || historicalRisk === 'High') {
      whyFactors.push('High historical vulnerability (15%)');
    } else {
      whyFactors.push('Baseline terrain stability (15%)');
    }
  }

  const handleApplyPreset = (preset: 'nh10' | 'dzongu' | 'sohra' | 'plains') => {
    if (preset === 'nh10') {
      setSelectedPresetName('NH-10, Sikkim');
      setRainfall(142);
      setSoilMoisture(87);
      setSlope(34);
      setHistoricalRisk('Extreme');
      setThreeDayRainfall(280);
      setThirtyDayRainfall(520);
      setSusceptibilityClass('Severe');
    } else if (preset === 'dzongu') {
      setSelectedPresetName('Dzongu Valley, Sikkim');
      setRainfall(136);
      setSoilMoisture(85);
      setSlope(41);
      setHistoricalRisk('Extreme');
      setThreeDayRainfall(260);
      setThirtyDayRainfall(490);
      setSusceptibilityClass('Severe');
    } else if (preset === 'sohra') {
      setSelectedPresetName('Cherrapunji (Sohra)');
      setRainfall(188);
      setSoilMoisture(91);
      setSlope(38);
      setHistoricalRisk('Extreme');
      setThreeDayRainfall(370);
      setThirtyDayRainfall(740);
      setSusceptibilityClass('Severe');
    } else if (preset === 'plains') {
      setSelectedPresetName('Tezpur Plains');
      setRainfall(25);
      setSoilMoisture(34);
      setSlope(12);
      setHistoricalRisk('Low');
      setThreeDayRainfall(40);
      setThirtyDayRainfall(110);
      setSusceptibilityClass('Moderate');
    }
  };

  return (
    <div
      id="ai-risk-score-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-[#0b1326] border border-slate-700/80 shadow-2xl p-6 sm:p-8 text-slate-100 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="close-ai-modal-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1.5 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Hazard Prediction Engine</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            AI RISK SCORE MODEL
          </h2>

          {/* Model Selection Switcher */}
          <div className="flex items-center gap-2 mt-3 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setModelEngine('geotech')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold font-mono transition-all flex items-center justify-center gap-1.5 ${
                modelEngine === 'geotech'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Multi-Factor Weights</span>
            </button>
            <button
              onClick={() => setModelEngine('isro')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold font-mono transition-all flex items-center justify-center gap-1.5 ${
                modelEngine === 'isro'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>ISRO Atlas 2023 Regression</span>
            </button>
          </div>

          {/* Official ISRO District Exposure Badge */}
          {currentDistrictRank && (
            <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-900/60 text-xs font-mono">
              <span className="text-blue-300">
                ISRO National Exposure Rank: <strong className="text-white font-bold">#{currentDistrictRank.rank} ({currentDistrictRank.district})</strong>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                {currentDistrictRank.region}
              </span>
            </div>
          )}
        </div>

        {/* Quick Presets */}
        <div className="mb-5">
          <span className="text-xs text-slate-400 block mb-2 font-medium">Scenario Presets:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleApplyPreset('nh10')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedPresetName === 'NH-10, Sikkim'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🔴 NH-10, Sikkim (Critical)
            </button>
            <button
              onClick={() => handleApplyPreset('sohra')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedPresetName === 'Cherrapunji (Sohra)'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🔴 Cherrapunji (Sohra)
            </button>
            <button
              onClick={() => handleApplyPreset('dzongu')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedPresetName === 'Dzongu Valley, Sikkim'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🔴 Dzongu Valley
            </button>
            <button
              onClick={() => handleApplyPreset('plains')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedPresetName === 'Tezpur Plains'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🟢 Tezpur Plains (Low)
            </button>
          </div>
        </div>

        {/* Calculated Result Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-[#111c38] to-[#0d162d] border border-slate-700/80 shadow-xl mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 block mb-1">
                {modelEngine === 'isro' ? 'ISRO Triggering Probability P(z)' : 'Calculated Risk Result'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black font-mono text-white tracking-tight">
                  {activeScore}
                </span>
                <span className="text-xl font-mono text-slate-400">
                  {modelEngine === 'isro' ? '%' : '/ 100'}
                </span>
              </div>
              {modelEngine === 'isro' && (
                <span className="text-[11px] font-mono text-cyan-300 block mt-1">
                  Logit z = {isroResult.zScore} • Class: <strong>{isroResult.decisionClass.toUpperCase()}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-xl text-sm font-black font-mono tracking-wider border shadow-md ${levelBg}`}>
                {riskLevel.toUpperCase()}
              </div>
            </div>
          </div>

          {/* "Why?" Section */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2 font-mono">
              Why?
            </span>
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center flex-wrap gap-2 text-xs font-semibold text-slate-200 font-mono">
              {whyFactors.map((factor, idx) => (
                <React.Fragment key={idx}>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-800/50 text-blue-200">
                    {factor}
                  </span>
                  {idx < whyFactors.length - 1 && (
                    <span className="text-blue-400 font-mono font-bold">+</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Model Inputs & Weights (Interactive Controls) */}
        {modelEngine === 'isro' ? (
          /* ISRO Logistic Regression Model Controls (Page 83) */
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 font-mono flex items-center gap-1.5">
                <Satellite className="w-3.5 h-3.5" />
                ISRO Empirical Predictor Variables (Page 83)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Formula: z = -3.817 + 0.077·DR + 0.058·3DCR + 0.009·30DAR
              </span>
            </div>

            {/* DR */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90">
              <div className="flex justify-between text-xs mb-2 font-mono">
                <span className="font-semibold text-slate-200">
                  DR: Daily Rainfall <span className="text-blue-400">(β = 0.077)</span>
                </span>
                <span className="font-bold text-white">{rainfall} mm / 24h</span>
              </div>
              <input
                type="range"
                min="0"
                max="250"
                value={rainfall}
                onChange={(e) => setRainfall(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* 3DCR */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90">
              <div className="flex justify-between text-xs mb-2 font-mono">
                <span className="font-semibold text-slate-200">
                  3DCR: 3-Day Cumulative Rainfall <span className="text-cyan-400">(β = 0.058)</span>
                </span>
                <span className="font-bold text-white">{threeDayRainfall} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                value={threeDayRainfall}
                onChange={(e) => setThreeDayRainfall(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* 30DAR */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90">
              <div className="flex justify-between text-xs mb-2 font-mono">
                <span className="font-semibold text-slate-200">
                  30DAR: 30-Day Antecedent Saturation <span className="text-indigo-400">(β = 0.009)</span>
                </span>
                <span className="font-bold text-white">{thirtyDayRainfall} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                value={thirtyDayRainfall}
                onChange={(e) => setThirtyDayRainfall(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Susceptibility Class */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90">
              <div className="flex justify-between text-xs mb-2 font-mono">
                <span className="font-semibold text-slate-200">Landslide Susceptibility Class (Table 4 Matrix)</span>
                <span className="font-bold text-white">{susceptibilityClass}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 font-mono text-xs">
                {(['Moderate', 'High', 'Very High', 'Severe'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSusceptibilityClass(lvl)}
                    className={`py-1.5 rounded-lg font-semibold transition-all ${
                      susceptibilityClass === lvl
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Multi-Factor Geotechnical Weights */
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                4 Model Factor Weights
              </span>
              <span className="text-[11px] text-slate-400">
                Total Weights: 35% + 25% + 25% + 15% = 100%
              </span>
            </div>

            {/* 1. Rainfall (35%) */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90">
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold text-slate-200">
                  1. Rainfall <span className="text-blue-400 font-mono font-normal">(Weight: 35%)</span>
                </span>
                <span className="font-mono font-bold text-white">{rainfall} mm / 24h</span>
              </div>
              <input
                type="range"
                min="0"
                max="220"
                value={rainfall}
                onChange={(e) => {
                  setRainfall(Number(e.target.value));
                  setSelectedPresetName('Custom Parameters');
                }}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* 2. Soil Moisture (25%) */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90">
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold text-slate-200">
                  2. Soil Moisture <span className="text-cyan-400 font-mono font-normal">(Weight: 25%)</span>
                </span>
                <span className="font-mono font-bold text-white">{soilMoisture}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={soilMoisture}
                onChange={(e) => {
                  setSoilMoisture(Number(e.target.value));
                  setSelectedPresetName('Custom Parameters');
                }}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* 3. Slope (25%) */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90">
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold text-slate-200">
                  3. Slope Gradient <span className="text-amber-400 font-mono font-normal">(Weight: 25%)</span>
                </span>
                <span className="font-mono font-bold text-white">{slope}°</span>
              </div>
              <input
                type="range"
                min="5"
                max="55"
                value={slope}
                onChange={(e) => {
                  setSlope(Number(e.target.value));
                  setSelectedPresetName('Custom Parameters');
                }}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* 4. Historical Landslide Risk (15%) */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90">
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold text-slate-200">
                  4. Historical Vulnerability <span className="text-purple-400 font-mono font-normal">(Weight: 15%)</span>
                </span>
                <span className="font-mono font-bold text-white">{historicalRisk}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['Low', 'Moderate', 'High', 'Extreme'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setHistoricalRisk(lvl);
                      setSelectedPresetName('Custom Parameters');
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                      historicalRisk === lvl
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={() => handleApplyPreset('nh10')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to NH-10 Sikkim</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
