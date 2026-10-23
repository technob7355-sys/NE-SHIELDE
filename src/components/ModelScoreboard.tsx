import React, { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { modelMeta } from '../ml/riskModelV3';

/**
 * ModelScoreboard — Imaandari Wala Scoreboard
 * ============================================
 * Dashboard bade-bade daave to sab karte hain. Ye board ulta karta hai:
 *   - Model kitna sahi hai, ASLI number ke saath (jo humne khud
 *     test karke nikale — validate_model.py se koi bhi dobara
 *     nikaal sakta hai)
 *   - Kahan model kamzor hai, wo bhi saaf-saaf
 *   - Konsi cheez LIVE hai, konsi MOCK hai, konsi SYNTHETIC hai —
 *     badge laga ke. Kuch chhupaya nahi hai.
 *
 * Saare number 23 Oct 2026 ke asal test run se hain.
 * Number badlein to pehle validate_model.py chalao, phir yahan badlo.
 */

type HonestyTag = 'LIVE' | 'MOCK' | 'SYNTHETIC' | 'REAL';

const TAG_STYLE: Record<HonestyTag, string> = {
  LIVE: 'bg-emerald-950 text-emerald-300 border-emerald-700',
  REAL: 'bg-blue-950 text-blue-300 border-blue-700',
  SYNTHETIC: 'bg-violet-950 text-violet-300 border-violet-700',
  MOCK: 'bg-amber-950 text-amber-300 border-amber-700',
};

const HONESTY_ROWS: { cheez: string; tag: HonestyTag; sach: string }[] = [
  {
    cheez: 'Live mausam (Open-Meteo se abhi liya gaya)',
    tag: 'LIVE',
    sach: 'Har fetch par time + hash stamp lagta hai (Prediction Audit dekho). Ye hi ekmatra sach me "live" hissa hai.',
  },
  {
    cheez: 'Dashboard ke 20 zones ke number (baarish, score 88 aadi)',
    tag: 'MOCK',
    sach: 'Website me pehle se likhe purane number hain. Roz NAHI badalte. Isliye hum inhe MOCK bolke dikhate hain.',
  },
  {
    cheez: 'Model ki training — 20 asli zones',
    tag: 'REAL',
    sach: 'Website/ISRO data se liye gaye asli ilaake. CSV ki "source" column me inpar "real" likha hai.',
  },
  {
    cheez: 'Model ki training — 600 extra rows',
    tag: 'SYNTHETIC',
    sach: 'Computer ne ISRO science ke rule se banaye hain taaki model seekh sake. "source" column me "synthetic" alag mark hai — asli bolke nahi becha.',
  },
  {
    cheez: 'Dashboard ke saare counts (Critical / High zones aadi)',
    tag: 'REAL',
    sach: 'V3 me counts zones data se usi time gin (compute) kar ke aate hain — koi pehle se likha number nahi hai. Koi ground sensor network is system ke paas nahi hai; data API + records se aata hai.',
  },
  {
    cheez: 'V3 training labels (weekly risk)',
    tag: 'SYNTHETIC',
    sach: 'Koi official per-day landslide record public nahi hai — isliye V3 ke weekly risk labels ISRO formula se derived hain. Baarish (input) real archive data hai, label formula-derived hai. Dono baatein alag-alag saaf boli gayi hain.',
  },
];

interface ModelScoreboardProps {
  /** Backtest page par pehle se khula dikhana ho to true do */
  defaultOpen?: boolean;
}

export const ModelScoreboard: React.FC<ModelScoreboardProps> = ({ defaultOpen = false }) => {
  const [open, setOpen] = useState<boolean>(defaultOpen);

  return (
    <section className="rounded-2xl border border-slate-700 bg-[#0b1326] shadow-xl" aria-label="Model Scoreboard">
      {/* Header — hamesha dikhega, click par khulega */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Model Bharosa Scoreboard — Model kitna sahi hai?
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            V1: MAE 4.15 (bharosa kam) • V2: MAE 3.74, R² 0.9543 • V3: temporal split par test — khulasa dekhne ke liye dabao
          </p>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-slate-300 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-300 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* V1 vs V2 table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-900 text-slate-400 text-left">
                  <th className="px-3 py-2 font-bold">Model</th>
                  <th className="px-3 py-2 font-bold">Data (Rows)</th>
                  <th className="px-3 py-2 font-bold">Galti (MAE)</th>
                  <th className="px-3 py-2 font-bold">Cross-Check (5-Fold CV)</th>
                  <th className="px-3 py-2 font-bold">Level Accuracy (Unseen Data)</th>
                  <th className="px-3 py-2 font-bold">Bharosa</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-800/70">
                  <td className="px-3 py-2 font-bold text-slate-200">V1 — Purana (Random Forest)</td>
                  <td className="px-3 py-2 text-slate-300">Sirf 20 rows</td>
                  <td className="px-3 py-2 font-mono text-slate-200">4.15 / 100</td>
                  <td className="px-3 py-2 text-slate-300">Kiya hi nahi ❌</td>
                  <td className="px-3 py-2 text-slate-300">Check nahi hua</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-md border font-bold text-[10px] bg-amber-950 text-amber-300 border-amber-700">
                      BHAROSA KAM
                    </span>
                  </td>
                </tr>
                <tr className="border-t border-slate-800/70 bg-emerald-950/20">
                  <td className="px-3 py-2 font-bold text-white">V2 — Naya (Gradient Boosting) ✅</td>
                  <td className="px-3 py-2 text-slate-200">
                    620 rows
                    <span className="block text-[11px] text-slate-400">20 asli (REAL) + 600 synthetic — CSV me alag-alag mark</span>
                  </td>
                  <td className="px-3 py-2 font-mono font-bold text-emerald-300">
                    3.74 / 100
                    <span className="block text-[11px] text-slate-400 font-sans">R² = 0.9543</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-200">CV MAE 3.50 (5 baar alag test)</td>
                  <td className="px-3 py-2 font-mono text-slate-200">
                    82.3% (102/124)
                    <span className="block text-[11px] text-slate-400 font-sans">jo data model ne dekha hi nahi tha, uspar (score round karke level check)</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-md border font-bold text-[10px] bg-emerald-950 text-emerald-300 border-emerald-700">
                      BEHTAR, PAR SEEMA KE SAATH
                    </span>
                  </td>
                </tr>
                <tr className="border-t border-slate-800/70 bg-cyan-950/20">
                  <td className="px-3 py-2 font-bold text-white">V3 — Sabse Naya (Temporal Split) ✅</td>
                  <td className="px-3 py-2 text-slate-200">
                    Real archive weather (Open-Meteo / ERA5)
                    <span className="block text-[11px] text-slate-400">Train: {modelMeta.trainedOn}</span>
                    <span className="block text-[11px] text-slate-400">Labels: ISRO formula-derived (weekly risk)</span>
                  </td>
                  <td className="px-3 py-2 font-mono font-bold text-cyan-300">
                    {modelMeta.testMAE} / 100
                    <span className="block text-[11px] text-slate-400 font-sans">R² = {modelMeta.r2}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-200">
                    Temporal split — purane saal train, naye saal test
                    <span className="block text-[11px] text-slate-400">Test period: {modelMeta.testPeriod}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-200">{modelMeta.levelAccuracy}%</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-md border font-bold text-[10px] bg-cyan-950 text-cyan-300 border-cyan-700">
                      BACKTEST SE CHECK HUA
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block">Jaane-pehchane Scenario Check</span>
              <strong className="text-emerald-300 text-base">3/3 PASS ✅</strong>
              <span className="block text-[11px] text-slate-400 mt-0.5">Bahut tez baarish → Critical, sukha-mausam → Low, beech wala → Moderate</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block">Ye number khud check karo</span>
              <strong className="text-white text-sm font-mono">ml/validate_model.py</strong>
              <span className="block text-[11px] text-slate-400 mt-0.5">Script chalao — yahi MAE, yahi accuracy dobara milegi (random seed fix hai)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block">Galti ka matlab</span>
              <strong className="text-white text-sm">MAE 3.74 matlab</strong>
              <span className="block text-[11px] text-slate-400 mt-0.5">Model ka score asli score se average me sirf ~4 number idhar-udhar hota hai</span>
            </div>
          </div>

          {/* Honesty warning — synthetic data ka sach */}
          <div className="p-3.5 rounded-xl bg-violet-950/40 border-2 border-violet-600/70 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-violet-300 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-violet-100">
              <p className="font-black text-sm text-white">⚠️ Synthetic data matlab kya hai — ye padhna zaroori hai</p>
              <p className="mt-1">
                V2 ki 620 rows me se 600 rows <strong>computer ke banaye hue (synthetic)</strong> hain — ISRO science ke
                rule se bane hain, asli ghatnaon (events) ke record nahi hain. Isliye upar wale saare number abhi{' '}
                <strong>usi training-data par kiye gaye test</strong> ke hain. Model ne abhi tak ye sabit NAHI kiya ki wo
                asli landslide ghatna ko pehle se pehchan lega.
              </p>
              <p className="mt-1 font-bold text-white">
                Asli imtihaan V3 me ho chuka hai: pichhle saalo ki documented landslide ghatnaon par backtest —
                "us din model kya bolta tha, aur sach me kya hua tha?" Poora result upar wale Backtest tab me
                source links ke saath hai. Phir bhi: V3 ke training labels formula-derived hain, isliye
                imaandari hi is system ki sabse badi feature hai.
              </p>
            </div>
          </div>

          {/* Konsi cheez LIVE / MOCK / SYNTHETIC / REAL */}
          <div>
            <h4 className="text-sm font-black text-white">Konsi cheez asli hai, konsi nakli? — Poora Sach</h4>
            <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
              <span className={`px-2 py-1 rounded-md border font-mono font-bold ${TAG_STYLE.LIVE}`}>LIVE = abhi internet se aaya, time stamp ke saath</span>
              <span className={`px-2 py-1 rounded-md border font-mono font-bold ${TAG_STYLE.REAL}`}>REAL = asli record / asli ilaaka</span>
              <span className={`px-2 py-1 rounded-md border font-mono font-bold ${TAG_STYLE.SYNTHETIC}`}>SYNTHETIC = computer ka banaya training data</span>
              <span className={`px-2 py-1 rounded-md border font-mono font-bold ${TAG_STYLE.MOCK}`}>MOCK = design ke liye likha purana/static number</span>
            </div>
            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 text-left">
                    <th className="px-3 py-2 font-bold">Cheez</th>
                    <th className="px-3 py-2 font-bold">Tag</th>
                    <th className="px-3 py-2 font-bold">Sach kya hai</th>
                  </tr>
                </thead>
                <tbody>
                  {HONESTY_ROWS.map((r) => (
                    <tr key={r.cheez} className="border-t border-slate-800/70">
                      <td className="px-3 py-2 text-slate-200 font-semibold">{r.cheez}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-md border font-mono font-bold text-[10px] ${TAG_STYLE[r.tag]}`}>{r.tag}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-400">{r.sach}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ModelScoreboard;
