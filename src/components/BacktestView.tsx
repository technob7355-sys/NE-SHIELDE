import React from 'react';
import { Target, ExternalLink, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { BACKTEST_CASES, BACKTEST_SUMMARY, type BacktestCase } from '../data/backtestData';
import { modelMeta } from '../ml/riskModelV3';
import { ModelScoreboard } from './ModelScoreboard';

/**
 * BacktestView — Asli Imtihaan (V3)
 * ===================================
 * Sawal: "Model pichhli asli ghatnaon par kaisa karta?"
 * Jawab: documented landslide events (source link ke saath) aur
 * control cases (jahan kuch nahi hua tha) — dono par V3 model ko
 * us din ke ARCHIVE mausam (Open-Meteo / ERA5) se chalaya gaya.
 *   Event  + model ne khatra bola  = HIT ✅
 *   Event  + model chup raha       = MISS ❌
 *   Control + model chup raha      = CORRECT-REJECT ✅
 *   Control + model ne jhootha alarm bajaya = FALSE-ALARM ⚠️
 * Saare number BACKTEST_SUMMARY / modelMeta se aate hain —
 * is file me koi number hardcoded nahi hai.
 */

const VERDICT_STYLE: Record<BacktestCase['verdict'], string> = {
  HIT: 'bg-emerald-950 text-emerald-300 border-emerald-700',
  MISS: 'bg-red-950 text-red-300 border-red-700',
  'CORRECT-REJECT': 'bg-blue-950 text-blue-300 border-blue-700',
  'FALSE-ALARM': 'bg-amber-950 text-amber-300 border-amber-700',
};

function VerdictBadge({ verdict }: { verdict: BacktestCase['verdict'] }) {
  return (
    <span className={`px-2 py-0.5 rounded-md border font-mono font-bold text-[10px] whitespace-nowrap ${VERDICT_STYLE[verdict]}`}>
      {verdict === 'HIT' && '✅ '}
      {verdict === 'MISS' && '❌ '}
      {verdict === 'CORRECT-REJECT' && '✅ '}
      {verdict === 'FALSE-ALARM' && '⚠️ '}
      {verdict}
    </span>
  );
}

function CaseTable({ cases, emptyText }: { cases: BacktestCase[]; emptyText: string }) {
  if (cases.length === 0) {
    return <p className="text-xs text-slate-400 p-3">{emptyText}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-900 text-slate-400 text-left">
            <th className="px-3 py-2 font-bold">Ghatna / Case</th>
            <th className="px-3 py-2 font-bold">Date</th>
            <th className="px-3 py-2 font-bold">Archive Baarish (24h / 3d / 30d)</th>
            <th className="px-3 py-2 font-bold">Model Bola</th>
            <th className="px-3 py-2 font-bold">Sach Me Hua</th>
            <th className="px-3 py-2 font-bold">Verdict</th>
            <th className="px-3 py-2 font-bold">Source</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} className="border-t border-slate-800/70 align-top">
              <td className="px-3 py-2">
                <span className="font-bold text-white block">{c.name}</span>
                <span className="text-slate-400 block">{c.location}, {c.state}</span>
                {c.note && <span className="text-slate-500 block mt-0.5">{c.note}</span>}
              </td>
              <td className="px-3 py-2 font-mono text-slate-300 whitespace-nowrap">{c.date}</td>
              <td className="px-3 py-2 font-mono text-slate-300 whitespace-nowrap">
                {c.rain24} / {c.rain3d} / {c.rain30d} mm
              </td>
              <td className="px-3 py-2 font-mono font-bold text-white whitespace-nowrap">
                {c.modelScore}/100 • {c.modelLevel}
              </td>
              <td className="px-3 py-2 text-slate-300">{c.actualOutcome}</td>
              <td className="px-3 py-2"><VerdictBadge verdict={c.verdict} /></td>
              <td className="px-3 py-2">
                {c.sourceUrl ? (
                  <a
                    href={c.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-start gap-1 text-cyan-300 font-bold underline"
                  >
                    <span>{c.sourceTitle || 'Source'}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" />
                  </a>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const BacktestView: React.FC = () => {
  const events = BACKTEST_CASES.filter((c) => c.type === 'event');
  const controls = BACKTEST_CASES.filter((c) => c.type === 'control');
  const s = BACKTEST_SUMMARY;
  const hasData = s.total > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header + badi accuracy */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-emerald-400" />
            Backtest — Asli Ghatnaon Par Imtihaan
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Model ko pichhli <strong className="text-slate-200">documented landslide ghatnaon</strong> ke din ke
            archive mausam par chalaya gaya. Model ne khatra bola aur sach me ghatna hui = HIT.
            Jahan kuch nahi hua tha (control), wahan chup rehna hi sahi jawab tha.
          </p>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            Model V3 • Trained on: {modelMeta.trainedOn} • Test period: {modelMeta.testPeriod} •
            Test MAE: {modelMeta.testMAE} • R²: {modelMeta.r2} • Level accuracy: {modelMeta.levelAccuracy}%
          </p>
        </div>
        <div className="text-center shrink-0 p-5 rounded-2xl bg-[#0b1326] border-2 border-emerald-600/70 shadow-xl min-w-[180px]">
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block">Backtest Accuracy</span>
          <span className="text-5xl font-black font-mono text-emerald-300 block mt-1">
            {hasData ? `${s.accuracyPct}%` : '—'}
          </span>
          <span className="text-xs text-slate-400 block mt-1">
            {hasData ? `${s.correct} / ${s.total} cases sahi` : 'Cases abhi load nahi hue'}
          </span>
        </div>
      </div>

      {!hasData && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border-2 border-amber-600/70 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-100 leading-relaxed">
            <strong>Backtest data abhi uplabdh nahi hai.</strong> Koi number banakar nahi dikhayenge —
            documented cases (source link ke saath) aate hi yahi page asli accuracy dikhayega.
            Dobara chalana ho to: <span className="font-mono">python ml/backtest.py</span>
          </p>
        </div>
      )}

      {/* Chhoti summary tiles — sab BACKTEST_SUMMARY se computed */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#0b1326] border border-slate-800">
          <span className="text-xs text-slate-400 block">Total Cases</span>
          <span className="text-2xl font-black font-mono text-white">{s.total}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0b1326] border border-slate-800">
          <span className="text-xs text-slate-400 block flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sahi Jawab</span>
          <span className="text-2xl font-black font-mono text-emerald-300">{s.correct}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0b1326] border border-slate-800">
          <span className="text-xs text-slate-400 block">Events: HIT</span>
          <span className="text-2xl font-black font-mono text-white">
            {s.eventHits}<span className="text-sm text-slate-400 font-normal"> / {s.eventsTotal}</span>
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0b1326] border border-slate-800">
          <span className="text-xs text-slate-400 block flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-red-400" /> Controls: Sahi Reject</span>
          <span className="text-2xl font-black font-mono text-white">
            {s.controlsCorrect}<span className="text-sm text-slate-400 font-normal"> / {s.controlsTotal}</span>
          </span>
        </div>
      </div>

      {/* Events table */}
      <section>
        <h2 className="text-base font-black text-white mb-2">
          🌋 Asli Ghatnayein (Events) — {events.length} cases
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          Har event ke saath source link hai — khud khol ke padh sakte ho ki ghatna sach me hui thi.
          Baarish usi din ki hai, Open-Meteo Archive (ERA5) se.
        </p>
        <CaseTable cases={events} emptyText="Abhi koi event case load nahi hua." />
      </section>

      {/* Controls table */}
      <section>
        <h2 className="text-base font-black text-white mb-2">
          🌤️ Control Cases — {controls.length} cases (jahan kuch NAHI hua tha)
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          Sirf ghatna pakadna kaafi nahi — bina wajah alarm bajana bhi galti hai (FALSE-ALARM).
          Control dinon par model ka chup rehna = CORRECT-REJECT.
        </p>
        <CaseTable cases={controls} emptyText="Abhi koi control case load nahi hua." />
      </section>

      {/* Model scoreboard — V1 / V2 / V3 tulna */}
      <ModelScoreboard defaultOpen />

      {/* Honesty box — sabse zaroori hissa */}
      <section className="p-5 rounded-2xl bg-indigo-950/40 border-2 border-indigo-600/70">
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-indigo-300" />
          Imaandari Box — Kya Real Hai, Kya Formula-Derived, Kya Synthetic Tha
        </h2>
        <div className="mt-3 space-y-2.5 text-sm leading-relaxed text-indigo-100">
          <p>
            <strong className="text-white">Kya real hai:</strong> archive rainfall (Open-Meteo / ERA5) —
            pichhle saalo ka asli mausam data, aur documented events with sources — har event ka
            source link upar table me hai, khud verify kar sakte ho.
          </p>
          <p>
            <strong className="text-white">Kya formula-derived hai:</strong> weekly risk labels —
            koi official per-day landslide record public nahi hai, isliye V3 ki training labels
            ISRO formula / vigyaan ke niyamo se derived hain. Ye baat chhupai nahi gayi hai.
          </p>
          <p>
            <strong className="text-white">Kya synthetic tha:</strong> V2 data — V2 ki 600 extra rows
            computer-generated (synthetic) thi. V3 ne usi kamzori ko theek karne ke liye real archive
            weather + temporal split (purane saal train, naye saal test) use kiya hai.
          </p>
          <p className="font-bold text-white">
            Matlab saaf hai: backtest ka matlab "model ne apna hi banaya data yaad kar liya" nahi hai —
            ye asli tareekho, asli baarish aur asli ghatnaon par hua imtihaan hai, uski seemaon ke saath.
          </p>
        </div>
      </section>
    </div>
  );
};

export default BacktestView;
