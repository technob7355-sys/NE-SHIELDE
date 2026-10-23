import React from 'react';
import { RiskZone } from '../types';
import { predictRiskV3 } from '../ml/riskModelV3';
import { MapPin, Droplets, Phone } from 'lucide-react';

/**
 * SimpleRiskCard — Aam Aadmi ke liye Risk Card
 * ============================================
 * Koi jargon nahi. Bada rang + bada emoji + aasan bhasha.
 * Gaon wala, driver, dukaan-daar — koi bhi 5 second me samjhe:
 *   🔴 Khatra hai  |  🟡 Dhyaan do  |  🟢 Safe hai
 * Aur turant pata chale: "Kya karein?"
 */

interface SimpleRiskCardProps {
  zone: RiskZone;
  onCallHelpline?: () => void;
  /**
   * Data kahan se aaya — V3 imaandari rule:
   * 'LIVE' = abhi Open-Meteo se aaya (zone ke number live values se bane hain)
   * 'MOCK' = live nahi mila, website ke purane static number hain — stamp lagega
   * undefined = purana behaviour (koi stamp nahi)
   */
  dataLabel?: 'LIVE' | 'MOCK';
  /** Provenance stamp line — jaise 'Source: Open-Meteo API • 23 Oct, 4:05 pm' */
  provenanceLine?: string;
}

interface SimpleStyle {
  emoji: string;
  headline: string;
  action: string;
  bg: string;
  border: string;
  text: string;
  badge: string;
}

function styleForLevel(level: string, score: number): SimpleStyle {
  if (level === 'Critical' || level === 'High' || score >= 65) {
    return {
      emoji: '🔴',
      headline: 'Khatra hai — Danger!',
      action:
        score >= 80
          ? 'Kya karein: Is raste par bilkul mat jao. Ghar ke andar raho, pahad ke neeche mat ruko. Zaroorat ho to 112 par call karo.'
          : 'Kya karein: Is raste par jaana taal do. Agar jaana hi pade to din me jao, tez gaadi mat chalao, pahad ke neeche mat ruko.',
      bg: 'bg-red-950/60',
      border: 'border-red-500',
      text: 'text-red-300',
      badge: 'bg-red-600 text-white',
    };
  }
  if (level === 'Moderate' || score >= 40) {
    return {
      emoji: '🟡',
      headline: 'Dhyaan do — Be Careful',
      action:
        'Kya karein: Yatra kar sakte ho, lekin savdhaan raho. Baarish tez ho to ruk jao. Sadak par mitti-patthar dikhe to aage mat badho.',
      bg: 'bg-yellow-950/50',
      border: 'border-yellow-500',
      text: 'text-yellow-300',
      badge: 'bg-yellow-500 text-black',
    };
  }
  return {
    emoji: '🟢',
    headline: 'Safe hai — All Clear',
    action:
      'Kya karein: Abhi koi khatra nahi hai. Aaram se yatra karo. Phir bhi baarish ke mausam me khabar dekhte raho.',
    bg: 'bg-emerald-950/50',
    border: 'border-emerald-500',
    text: 'text-emerald-300',
    badge: 'bg-emerald-600 text-white',
  };
}

export const SimpleRiskCard: React.FC<SimpleRiskCardProps> = ({ zone, dataLabel, provenanceLine }) => {
  // Website ke purane number ki jagah V2 model se taaza andaz bhi nikalo.
  // Agar zone me 3-day / 30-day data nahi hai to purane score se andaz banao.
  const threeDay =
    zone.threeDayCumulativeRainfall ?? Math.round(zone.rainfall * 2.2);
  const antecedent =
    zone.thirtyDayAntecedentRainfall ?? Math.round(threeDay * 3 + zone.rainfall * 2);
  const predicted = predictRiskV3({
    rainfall: zone.rainfall,
    soilMoisture: zone.soilMoisture,
    slope: zone.slope,
    historicalRisk: zone.historicalRisk,
    threeDayRainfall: threeDay,
    antecedentRainfall: antecedent,
  });

  // Dikhane ke liye website wala score hi rakho (wahi sach mana jata hai),
  // model ka score chhota karke "AI andaz" me dikhao.
  const style = styleForLevel(zone.riskLevel, zone.riskScore);
  const nearestHospital = zone.nearbyHospitals?.[0];

  return (
    <article
      className={`rounded-2xl border-2 ${style.border} ${style.bg} p-5 shadow-xl`}
      aria-label={`${zone.name} — ${style.headline}`}
    >
      {/* V3 Data stamp — LIVE ya MOCK, saaf dikhega */}
      {dataLabel === 'MOCK' && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500 text-black text-xs font-black text-center tracking-wide">
          ⚠️ MOCK DATA — Live data nahi mila, ye purane static number hain
        </div>
      )}
      {dataLabel === 'LIVE' && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-black text-center tracking-wide">
          🟢 LIVE DATA — Open-Meteo se abhi liya gaya
        </div>
      )}

      {/* Upar: jagah + bada signal */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <MapPin className="w-3.5 h-3.5" />
            <span>{zone.state}</span>
            {zone.affectedRoad && <span>• {zone.affectedRoad}</span>}
          </div>
          <h3 className="text-lg font-black text-white leading-tight mt-1">{zone.name}</h3>
        </div>
        <div className="text-center shrink-0">
          <div className="text-4xl leading-none" aria-hidden="true">{style.emoji}</div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            {zone.riskScore}
            <span className="text-xs font-normal text-slate-400">/100</span>
          </div>
        </div>
      </div>

      {/* Badi aasan headline */}
      <div className={`mt-3 px-3 py-2 rounded-xl font-black text-base ${style.badge} text-center`}>
        {style.headline}
      </div>

      {/* Kyun? — aasan bhasha me 2-3 wajah */}
      <div className="mt-3 space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Kyun? (Why?)</p>
        {predicted.reasons.slice(0, 3).map((reason, i) => (
          <p key={i} className="text-sm text-slate-200 leading-relaxed">• {reason}</p>
        ))}
        <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
          <Droplets className="w-3.5 h-3.5 text-blue-400" />
          Baarish: {zone.rainfall} mm • AI andaz score: {predicted.score}/100
        </p>
      </div>

      {/* Kya karein — sabse zaroori hissa */}
      <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-700">
        <p className="text-sm font-semibold text-white leading-relaxed">{style.action}</p>
      </div>

      {/* Sabse paas hospital — ek line me */}
      {nearestHospital && (
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-300">
            🏥 Sabse paas hospital: <strong className="text-white">{nearestHospital.name}</strong>{' '}
            ({nearestHospital.distanceKm} km)
          </span>
          <a
            href={`tel:${nearestHospital.contactNumber.split('/')[0].trim()}`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0"
          >
            <Phone className="w-3.5 h-3.5" /> Call
          </a>
        </div>
      )}
      {/* Provenance stamp line — source + time */}
      {provenanceLine && (
        <p className="mt-3 pt-2 border-t border-slate-700/60 text-[10px] font-mono text-slate-400 break-words">
          {provenanceLine}
        </p>
      )}
    </article>
  );
};

export default SimpleRiskCard;
