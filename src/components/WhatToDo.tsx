import React from 'react';
import { Phone, Hospital, Route, Eye, Megaphone, Home } from 'lucide-react';

/**
 * WhatToDo — Landslide Dikhe To Kya Karein?
 * ==========================================
 * Emergency guide aasan bhasha me. Ghabrahat ke time
 * lambi report koi nahi padhta — isliye bade akshar,
 * chhote steps, aur ek-tap call button.
 * Helpline: 112 (All India Emergency) • 1077 (District Control Room)
 *           108 (Ambulance) • 1070 (State Emergency)
 */

const STEPS: { icon: string; title: string; detail: string }[] = [
  {
    icon: '🏃',
    title: '1. Turant bhaago — sideways bhaago',
    detail:
      'Mitti girne ki disha me mat bhaago. Pahad se door, side ki taraf, unchi aur mazboot jagah par jao. (Run sideways, away from the hill — never downhill in the slide path.)',
  },
  {
    icon: '🚫',
    title: '2. Wapas mat jao',
    detail:
      'Samaan lene, photo lene ya gaadi nikaalne wapas mat jao. Dusra slide pehle se bada hota hai. (Do not go back for things or photos.)',
  },
  {
    icon: '📢',
    title: '3. Aas-paas walon ko chillakar batao',
    detail:
      'Seeti bajao, chillao, phone karo — neeche wale gaon / gaadi walon ko rok do. (Warn everyone nearby loudly.)',
  },
  {
    icon: '🚗',
    title: '4. Gaadi me ho to?',
    detail:
      'Sadak par mitti, patthar, tedhi-mendhi daraar ya ajeeb awaaz dikhe to gaadi rok kar peeche aao. Pahad ke bilkul neeche gaadi khadi mat karo. (If driving: stop, turn back, never park under a steep hill.)',
  },
  {
    icon: '👀',
    title: '5. Pehchaan — khatre ke sign',
    detail:
      'Deewaar/sadak me nayi daraar, darwaaze atakna, nala ka paani achaanak gaayab ya keechad wala hona, patthar girne ki awaaz — ye sab landslide se pehle ke sign hain. (New cracks, stuck doors, muddy or vanished stream water = warning signs.)',
  },
  {
    icon: '🏠',
    title: '6. Raat ko khaas dhyaan',
    detail:
      'Tez baarish wali raat me pahad ke paas wale kamre me mat so. Halki neend rakho, torch aur phone paas rakho. (Sleep away from the hill-side wall on heavy-rain nights.)',
  },
];

export const WhatToDo: React.FC = () => {
  return (
    <section className="rounded-2xl bg-[#0b1326] border-2 border-amber-500/70 shadow-xl p-5 sm:p-6" aria-label="Emergency guide">
      <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3 mb-4">
        <Megaphone className="w-6 h-6 text-amber-400" />
        <div>
          <h2 className="text-xl font-black text-white leading-tight">Landslide Dikhe To Kya Karein?</h2>
          <p className="text-xs text-slate-400">What to do in a landslide — aasan steps, abhi padh lo, kaam aayega.</p>
        </div>
      </div>

      {/* Ek-tap emergency call — sabse upar, sabse bada */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <a href="tel:112" className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm shadow-lg active:scale-95 transition-all">
          <Phone className="w-4 h-4" /> 112 — Emergency
        </a>
        <a href="tel:108" className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg active:scale-95 transition-all">
          <Hospital className="w-4 h-4" /> 108 — Ambulance
        </a>
        <a href="tel:1077" className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-lg active:scale-95 transition-all">
          <Phone className="w-4 h-4" /> 1077 — Zila Control
        </a>
        <a href="tel:1070" className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-lg active:scale-95 transition-all">
          <Phone className="w-4 h-4" /> 1070 — State Helpline
        </a>
      </div>

      {/* 6 steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STEPS.map((step) => (
          <div key={step.title} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">{step.icon}</span> {step.title}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mt-1">{step.detail}</p>
          </div>
        ))}
      </div>

      {/* Safe route tips */}
      <div className="mt-4 p-4 rounded-xl bg-blue-950/50 border border-blue-800/60">
        <h3 className="text-sm font-black text-blue-200 flex items-center gap-2">
          <Route className="w-4 h-4" /> Safe Raste Ke Tips (Safe Route Tips)
        </h3>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-200 leading-relaxed">
          <li>• Baarish me pahadi rasta ho sake to <strong>din me</strong> hi cross karo, raat ko nahi.</li>
          <li>• Jis raste par 🔴 Khatra dikhe, uska <strong>doosra rasta</strong> pehle se pata karke rakho — gaon ke bade-buzurg / thane se pooch lo.</li>
          <li>• Nadi-naala ubhaar par ho to pull cross mat karo — paani kam hone ka intezaar karo.</li>
          <li>• Yatra se pehle is app par apne raste ka risk zaroor check karo aur ghar walon ko bata kar niklo.</li>
        </ul>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" /> Kuch galat dikhe (daraar, patthar, mitti) to app ke <strong className="text-slate-200">Report Hazard</strong> page par turant batao — tumhari report dusron ki jaan bacha sakti hai.
        </p>
        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
          <Home className="w-3.5 h-3.5" /> Note: Hospital ki duri / number zone ke card me diya hai — apne ilaake ka number phone me save karke rakho.
        </p>
      </div>
    </section>
  );
};

export default WhatToDo;
