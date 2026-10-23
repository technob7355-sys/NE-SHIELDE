import React, { useMemo, useState } from 'react';
import { RiskZone } from '../types';
import { predictRiskV3, modelMeta, type RiskOutput } from '../ml/riskModelV3';

/** V3 contract me type naam SimpleLevel nahi hai — level wahi 4 hain */
type SimpleLevel = RiskOutput['level'];

/** Score -> level (V2 wala hi band: 80/65/40) — V3 contract me alag export nahi hai */
function scoreToLevel(score: number): SimpleLevel {
  if (score >= 80) return 'Critical';
  if (score >= 65) return 'High';
  if (score >= 40) return 'Moderate';
  return 'Low';
}
import { fetchWithProvenance, Provenance } from '../services/provenance';
import {
  ShieldCheck,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from 'lucide-react';

/**
 * PredictionAudit — Khula Hisaab (No Black Box)
 * ==============================================
 * Sawal: "Model ne ye number kahan se nikala? Data real hai ya fake?
 *         Prediction sahi hai ya galat — kaise pata chalega?"
 *
 * Ye component teen step me SAB KUCH khol ke dikhata hai:
 *   Step 1: Kaunsa number kahan se aaya — LIVE / MOCK / ANDAZ stamp ke saath
 *   Step 2: Har factor ne score me kitne number diye — bar chart me
 *   Step 3: Teen alag-alag tareekon se check (ML model, ISRO formula,
 *           simple rule) — teeno ek baat bole to Bharosa HIGH,
 *           alag-alag bole to saaf chetaavni: "Mismatch — verify karo"
 *
 * Aur last me poori audit ek JSON file me download ho jati hai —
 * jo chahe, baad me khud mila ke dekh le. Bharosa = saboot.
 */

interface PredictionAuditProps {
  zone: RiskZone;
}

/** Ek input number kahan se aaya — ye stamp hi bharose ki neev hai */
type SourceTag = 'LIVE' | 'MOCK' | 'ANDAZ' | 'FIXED' | 'RECORD';

interface InputRow {
  label: string;
  value: string;
  tag: SourceTag;
  note: string;
}

const TAG_STYLE: Record<SourceTag, string> = {
  LIVE: 'bg-emerald-950 text-emerald-300 border-emerald-700',
  MOCK: 'bg-amber-950 text-amber-300 border-amber-700',
  ANDAZ: 'bg-orange-950 text-orange-300 border-orange-700',
  FIXED: 'bg-slate-800 text-slate-300 border-slate-600',
  RECORD: 'bg-blue-950 text-blue-300 border-blue-700',
};

const LEVEL_ORDER: Record<SimpleLevel, number> = { Low: 0, Moderate: 1, High: 2, Critical: 3 };

/**
 * ISRO probability se level.
 * NOTE (imaandari): ISRO formula bahut sensitive hai — thodi si
 * baarish par bhi probability 100% ke paas chali jati hai
 * (formula doosre scale par bana tha). Isliye band unche rakhe
 * hain, aur phir bhi agar ye ML se alag bole to mismatch flag
 * lagega — wahi is audit ka kaam hai: alag baat chhupana nahi,
 * dikhana hai.
 */
function isroLevel(probPct: number): SimpleLevel {
  if (probPct >= 99.5) return 'Critical';
  if (probPct >= 98) return 'High';
  if (probPct >= 90) return 'Moderate';
  return 'Low';
}

/**
 * Teesra tareeka — Simple Rule Check.
 * Koi AI nahi, seedha-saada "agar-aisa-to-waisa" rule jo
 * gaon ka aadmi bhi kagaz par laga le. ML se alag raasta,
 * isliye cross-check ka matlab hai.
 */
function ruleCheck(rainfall: number, soil: number, slope: number): { level: SimpleLevel; reason: string } {
  if (rainfall > 100 && soil > 80 && slope > 30) {
    return { level: 'Critical', reason: 'Teeno khatre ek saath: tez baarish + bheegi mitti + tez dhalan.' };
  }
  if (rainfall > 80 && soil > 70 && slope > 25) {
    return { level: 'High', reason: 'Baarish tez, mitti geeli aur dhalan bhi zyada — bada khatra.' };
  }
  if (rainfall > 40 || soil > 65 || slope > 32) {
    return { level: 'Moderate', reason: 'Koi ek cheez dhyaan dene wali hai (baarish / nami / dhalan).' };
  }
  return { level: 'Low', reason: 'Baarish kam, mitti zyada geeli nahi, dhalan bhi halki.' };
}

export const PredictionAudit: React.FC<PredictionAuditProps> = ({ zone }) => {
  const [provenance, setProvenance] = useState<Provenance | null>(null);
  const [useLive, setUseLive] = useState<boolean>(false);
  const [loadingLive, setLoadingLive] = useState<boolean>(false);

  // --- Kaunse number use honge? Pehle website (mock) wale ---
  const mockThreeDay = zone.threeDayCumulativeRainfall ?? Math.round(zone.rainfall * 2.2);
  const mockAntecedent =
    zone.thirtyDayAntecedentRainfall ?? Math.round(mockThreeDay * 3 + zone.rainfall * 2);

  const liveActive = useLive && provenance !== null && provenance.isLive;

  const inputs = liveActive && provenance
    ? {
        rainfall: provenance.rawRainfallMm,
        soilMoisture: provenance.convertedSoilPct,
        slope: zone.slope,
        historicalRisk: zone.historicalRisk,
        threeDayRainfall: provenance.threeDayRainfallMm,
        antecedentRainfall: provenance.antecedentRainfallMm,
      }
    : {
        rainfall: zone.rainfall,
        soilMoisture: zone.soilMoisture,
        slope: zone.slope,
        historicalRisk: zone.historicalRisk,
        threeDayRainfall: mockThreeDay,
        antecedentRainfall: mockAntecedent,
      };

  // --- Model prediction + teeno cross-check ---
  const audit = useMemo(() => {
    const ml = predictRiskV3(inputs);
    // ISRO formula (Landslide Atlas 2023)
    const z = -3.817 + 0.077 * inputs.rainfall + 0.058 * inputs.threeDayRainfall + 0.009 * inputs.antecedentRainfall;
    const isroProbPct = Math.round((1 / (1 + Math.exp(-z))) * 1000) / 10;
    const isroLvl = isroLevel(isroProbPct);
    const rule = ruleCheck(inputs.rainfall, inputs.soilMoisture, inputs.slope);

    const levels = [ml.level, isroLvl, rule.level];
    const allSame = levels[0] === levels[1] && levels[1] === levels[2];
    const maxGap = Math.max(...levels.map((l) => LEVEL_ORDER[l])) - Math.min(...levels.map((l) => LEVEL_ORDER[l]));

    let bharosa: 'HIGH' | 'MEDIUM' | 'LOW';
    if (allSame) bharosa = 'HIGH';
    else if (maxGap <= 1) bharosa = 'MEDIUM';
    else bharosa = 'LOW';

    return { ml, z, isroProbPct, isroLvl, rule, bharosa, allSame };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs.rainfall, inputs.soilMoisture, inputs.slope, inputs.threeDayRainfall, inputs.antecedentRainfall, zone.id]);

  // --- Step 1 ki table: har number + uska stamp ---
  const fetchedTime = provenance?.isLive
    ? new Date(provenance.fetchedAtISO).toLocaleString('en-IN')
    : '';
  const rows: InputRow[] = [
    {
      label: 'Aaj ki baarish (Rainfall 24h)',
      value: `${inputs.rainfall} mm`,
      tag: liveActive ? 'LIVE' : 'MOCK',
      note: liveActive ? `Open-Meteo se liya • ${fetchedTime}` : 'Website ka purana static number hai',
    },
    {
      label: '3 din ki baarish (3-Day)',
      value: `${inputs.threeDayRainfall} mm`,
      tag: liveActive ? 'LIVE' : zone.threeDayCumulativeRainfall ? 'MOCK' : 'ANDAZ',
      note: liveActive ? 'Open-Meteo ke 72 ghante jod ke' : 'Website me nahi tha — aaj ki baarish se andaz lagaya',
    },
    {
      label: '30 din ki baarish (Antecedent)',
      value: `${inputs.antecedentRainfall} mm`,
      tag: liveActive ? 'LIVE' : zone.thirtyDayAntecedentRainfall ? 'MOCK' : 'ANDAZ',
      note: liveActive ? 'Open-Meteo ke 30 din jod ke' : 'Andaz wala number hai — live check par asli milega',
    },
    {
      label: 'Mitti ki nami (Soil Moisture)',
      value: `${inputs.soilMoisture}%`,
      tag: liveActive ? 'LIVE' : 'MOCK',
      note: liveActive && provenance
        ? `API raw ${provenance.rawSoilRaw} m³/m³ ÷ 0.45 × 100 = ${provenance.convertedSoilPct}%`
        : 'Website ka purana static number hai',
    },
    {
      label: 'Dhalan (Slope)',
      value: `${inputs.slope}°`,
      tag: 'FIXED',
      note: 'Pahad ki dhalan — ye roz nahi badalti, map/record se hai',
    },
    {
      label: 'Purana risk (Historical)',
      value: String(inputs.historicalRisk),
      tag: 'RECORD',
      note: 'ISRO / purane records me is jagah ka risk — roz nahi badalta',
    },
  ];

  // --- Live data laane wala button ---
  const handleFetchLive = async () => {
    setLoadingLive(true);
    const prov = await fetchWithProvenance(zone.lat, zone.lng);
    setProvenance(prov);
    setUseLive(prov.isLive); // fail ho to mock par hi rahenge, jhooth nahi bolenge
    setLoadingLive(false);
  };

  // --- Audit JSON download: poora saboot ek file me ---
  const handleDownloadAudit = () => {
    const auditJson = {
      zone: { id: zone.id, name: zone.name, state: zone.state, lat: zone.lat, lng: zone.lng },
      generatedAtISO: new Date().toISOString(),
      modelVersion: `V3 (testMAE ${modelMeta.testMAE}, R2 ${modelMeta.r2}, trained: ${modelMeta.trainedOn}, test: ${modelMeta.testPeriod})`,
      dataMode: liveActive ? 'LIVE' : 'MOCK (website static data — live fetch nahi hua ya fail hua)',
      inputs: {
        rainfallMm: inputs.rainfall,
        soilMoisturePct: inputs.soilMoisture,
        slopeDeg: inputs.slope,
        historicalRisk: inputs.historicalRisk,
        threeDayRainfallMm: inputs.threeDayRainfall,
        antecedentRainfallMm: inputs.antecedentRainfall,
        sources: rows.map((r) => ({ input: r.label, value: r.value, source: r.tag, note: r.note })),
      },
      provenance: provenance ?? { isLive: false, note: 'Is audit me live fetch use nahi hua' },
      breakdown: audit.ml.breakdown,
      prediction: {
        score: audit.ml.score,
        level: audit.ml.level,
        reasons: audit.ml.reasons,
        isroProbabilityPct: audit.ml.isroProbability,
      },
      crossCheck: {
        mlModel: { score: audit.ml.score, level: audit.ml.level },
        isroFormula: { z: Math.round(audit.z * 100) / 100, probabilityPct: audit.isroProbPct, level: audit.isroLvl },
        simpleRule: { level: audit.rule.level, reason: audit.rule.reason },
        bharosa: audit.bharosa,
        teenoEkBaat: audit.allSame,
      },
    };
    const blob = new Blob([JSON.stringify(auditJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ne-shield-audit-${zone.id}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const verdictStyle =
    audit.bharosa === 'HIGH'
      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
      : audit.bharosa === 'MEDIUM'
        ? 'bg-yellow-950/70 border-yellow-500 text-yellow-200'
        : 'bg-red-950/70 border-red-500 text-red-200';

  return (
    <section className="rounded-2xl border-2 border-cyan-700 bg-[#0a1428] p-5 shadow-xl" aria-label="Prediction Audit">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            Khula Hisaab — Prediction Audit
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {zone.name} • Number kahan se aaya, model ne kya joda, aur teeno check mile ya nahi — sab saamne hai.
          </p>
        </div>
        <div className="text-center shrink-0">
          <div className="text-3xl font-black font-mono text-white">
            {audit.ml.score}
            <span className="text-xs font-normal text-slate-400">/100</span>
          </div>
          <div className="text-[11px] font-mono font-bold text-cyan-300">
            {audit.ml.level} • {liveActive ? '🟢 LIVE data par' : '🟠 MOCK data par'}
          </div>
        </div>
      </div>

      {/* Live check button + provenance stamp */}
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleFetchLive}
            disabled={loadingLive}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-xs font-black"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLive ? 'animate-spin' : ''}`} />
            {loadingLive ? 'Live data aa raha hai…' : 'Live data se check karo (Open-Meteo)'}
          </button>
          {liveActive && (
            <button
              onClick={() => setUseLive(false)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
            >
              Wapas MOCK data dekho (farak saaf dikhega)
            </button>
          )}
        </div>

        {provenance && provenance.isLive && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-200 space-y-1">
            <p className="font-bold text-emerald-300">🟢 LIVE SABOOT (Provenance Stamp)</p>
            <p>Source: {provenance.sourceName} • Time: {fetchedTime}</p>
            <p>
              Raw data: baarish {provenance.rawRainfallMm} mm • mitti raw {provenance.rawSoilRaw} m³/m³ → {provenance.convertedSoilPct}% •{' '}
              {provenance.hourlyRowsCount} hourly rows aayi
            </p>
            <p className="font-mono text-[11px]">
              Data ka hash (angutha-nishan): {provenance.hash} — data badlega to ye badal jayega
            </p>
            <a
              href={provenance.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-cyan-300 font-bold underline"
            >
              Khud check karo — yahi URL browser me kholo <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
        {provenance && !provenance.isLive && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-xs text-red-200">
            ⚠️ Live data NAHI mila ({provenance.error}). Isliye upar ke number abhi bhi MOCK hain —
            hum nakli ko live bolke nahi dikhayenge. Internet check karke dobara try karo.
          </div>
        )}
      </div>

      {/* STEP 1: Input table */}
      <div className="mt-5">
        <h4 className="text-sm font-black text-white">Step 1 — Model ko kya-kya diya gaya? (Inputs + Source)</h4>
        <div className="mt-2 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-900 text-slate-400 text-left">
                <th className="px-3 py-2 font-bold">Cheez (Input)</th>
                <th className="px-3 py-2 font-bold">Number</th>
                <th className="px-3 py-2 font-bold">Source</th>
                <th className="px-3 py-2 font-bold">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-slate-800/70">
                  <td className="px-3 py-2 text-slate-200 font-semibold">{r.label}</td>
                  <td className="px-3 py-2 font-mono font-black text-white">{r.value}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-md border font-mono font-bold text-[10px] ${TAG_STYLE[r.tag]}`}>{r.tag}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-400">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">
          Matlab saaf hai: <strong className="text-emerald-300">LIVE</strong> = abhi API se aaya hua asli number •{' '}
          <strong className="text-amber-300">MOCK</strong> = website me pehle se likha purana number •{' '}
          <strong className="text-orange-300">ANDAZ</strong> = hisaab se banaya andaz •{' '}
          <strong className="text-slate-300">FIXED/RECORD</strong> = roz na badalne wali jaankari.
        </p>
      </div>

      {/* STEP 2: Breakdown bars */}
      <div className="mt-5">
        <h4 className="text-sm font-black text-white">Step 2 — Score {audit.ml.score}/100 bana kaise? (Har factor ka hissa)</h4>
        <div className="mt-2 space-y-2">
          {audit.ml.breakdown.map((b) => (
            <div key={b.factor} className="flex items-center gap-3 text-xs">
              <span className="w-52 shrink-0 text-slate-300 font-semibold">{b.factor}</span>
              <div className="flex-1 h-4 rounded-md bg-slate-900 border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-600 to-blue-500"
                  style={{ width: `${Math.min(100, (b.points / b.maxPoints) * 100)}%` }}
                />
              </div>
              <span className="w-20 shrink-0 text-right font-mono font-bold text-white">
                +{b.points} <span className="text-slate-500 font-normal">/ {b.maxPoints}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">
          Saare hisse jodo = score (rounding ki wajah se ±1 ka farak ho sakta hai). Koi number chhupa hua nahi hai.
        </p>
        <div className="mt-2 space-y-1">
          {audit.ml.reasons.slice(0, 3).map((reason, i) => (
            <p key={i} className="text-xs text-slate-300">• {reason}</p>
          ))}
        </div>
      </div>

      {/* STEP 3: Three-way cross-check */}
      <div className="mt-5">
        <h4 className="text-sm font-black text-white">Step 3 — Teen tareekon se cross-check (Teeno mile to bharosa)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700">
            <p className="text-[11px] font-mono font-bold text-slate-400">A • ML MODEL (V3)</p>
            <p className="text-xl font-black font-mono text-white mt-1">
              {audit.ml.score}/100 • {audit.ml.level}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">V3 model — temporal split (purane saal train, naye saal test), real archive weather par trained. Browser wala distilled version.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700">
            <p className="text-[11px] font-mono font-bold text-slate-400">B • ISRO FORMULA (Atlas 2023)</p>
            <p className="text-xl font-black font-mono text-white mt-1">
              {audit.isroProbPct}% • {audit.isroLvl}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              z = −3.817 + 0.077×{inputs.rainfall} + 0.058×{inputs.threeDayRainfall} + 0.009×{inputs.antecedentRainfall} = {audit.z.toFixed(1)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700">
            <p className="text-[11px] font-mono font-bold text-slate-400">C • SIMPLE RULE (Kagaz wala hisaab)</p>
            <p className="text-xl font-black font-mono text-white mt-1">{audit.rule.level}</p>
            <p className="text-[11px] text-slate-400 mt-1">{audit.rule.reason}</p>
          </div>
        </div>

        <div className={`mt-3 p-3.5 rounded-xl border-2 flex items-start gap-2.5 ${verdictStyle}`}>
          {audit.bharosa === 'HIGH' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : audit.bharosa === 'MEDIUM' ? (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-bold leading-relaxed">
            {audit.bharosa === 'HIGH' &&
              'Teeno tareeke ek baat bol rahe hain — Bharosa: HIGH ✅ Teeno ka jawab ek hai, is prediction par bharosa kar sakte ho.'}
            {audit.bharosa === 'MEDIUM' &&
              'Do tareeke lagbhag ek baat bol rahe hain, ek thoda alag hai — Bharosa: MEDIUM ⚠️ Faisla lene se pehle live data se ek baar aur check kar lo.'}
            {audit.bharosa === 'LOW' &&
              'Mismatch hai — tareeke alag-alag bol rahe hain 🔴 Bharosa: LOW. Is number par aankh band karke bharosa mat karo — manually verify karo, ground par jaankari lo.'}
          </p>
        </div>
      </div>

      {/* Download audit */}
      <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-800 pt-3">
        <p className="text-[11px] text-slate-500">
          Ye poora hisaab (inputs, source stamp, breakdown, cross-check) ek file me le jao — judge, teacher ya koi bhi
          baad me khud numbers mila ke check kar sakta hai. Model version: V3 • Score level bhi yahi se banta hai:{' '}
          {scoreToLevel(audit.ml.score)}
        </p>
        <button
          onClick={handleDownloadAudit}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shrink-0"
        >
          <Download className="w-4 h-4" /> Audit JSON Download Karo
        </button>
      </div>
    </section>
  );
};

export default PredictionAudit;
