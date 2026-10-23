import React, { useEffect, useState } from 'react';
import { fetchLiveWeather, LiveWeather } from '../services/liveWeather';
import { predictRisk, RiskOutput } from '../ml/riskModel';
import { CloudRain, RefreshCw } from 'lucide-react';

/**
 * LiveWeatherBadge — Live Mausam + Live Risk
 * ===========================================
 * Jagah ke lat/lng se Open-Meteo ka taaza data laata hai
 * aur riskModel.ts se usi time ka risk nikaal ke dikhata hai.
 * Data na aaye to ghabrana nahi — saaf-saaf "Live data nahi mila"
 * dikhega, purana data live bolke nahi dikhayenge.
 */

interface LiveWeatherBadgeProps {
  lat: number;
  lng: number;
  slope: number;
  historicalRisk: string | number;
  placeName?: string;
}

export const LiveWeatherBadge: React.FC<LiveWeatherBadgeProps> = ({
  lat,
  lng,
  slope,
  historicalRisk,
  placeName,
}) => {
  const [weather, setWeather] = useState<LiveWeather | null>(null);
  const [risk, setRisk] = useState<RiskOutput | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const w = await fetchLiveWeather(lat, lng);
      setWeather(w);
      setRisk(
        predictRisk({
          rainfall: w.rainfall,
          soilMoisture: w.soilMoisture,
          slope,
          historicalRisk,
          threeDayRainfall: w.threeDayRainfall,
          antecedentRainfall: w.antecedentRainfall,
        })
      );
    } catch {
      setError('Live data nahi mila — internet check karke dobara try karo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Har 30 minute me khud refresh ho jaye
    const timer = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  if (loading && !weather) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
        <span>Live mausam liya ja raha hai… (Fetching live weather…)</span>
      </div>
    );
  }

  if (error || !weather || !risk) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-amber-800 text-xs text-amber-300">
        <span>⚠️ {error || 'Live data uplabdh nahi hai.'}</span>
        <button onClick={load} className="px-2 py-1 rounded-lg bg-slate-800 text-white font-bold shrink-0">
          Dobara Try
        </button>
      </div>
    );
  }

  const color =
    risk.level === 'Critical' || risk.level === 'High'
      ? 'border-red-500 text-red-300'
      : risk.level === 'Moderate'
        ? 'border-yellow-500 text-yellow-300'
        : 'border-emerald-500 text-emerald-300';

  return (
    <div className={`rounded-xl border bg-slate-900/80 px-3.5 py-3 ${color}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs font-bold text-white">
          <CloudRain className="w-4 h-4 text-blue-400" />
          LIVE Mausam {placeName ? `• ${placeName}` : ''} <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
        </span>
        <button onClick={load} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-center text-xs">
        <div className="bg-slate-950/60 rounded-lg p-2">
          <span className="text-slate-400 block">24h Baarish</span>
          <strong className="text-white text-sm">{weather.rainfall} mm</strong>
        </div>
        <div className="bg-slate-950/60 rounded-lg p-2">
          <span className="text-slate-400 block">3-Din Baarish</span>
          <strong className="text-white text-sm">{weather.threeDayRainfall} mm</strong>
        </div>
        <div className="bg-slate-950/60 rounded-lg p-2">
          <span className="text-slate-400 block">Mitti Nami</span>
          <strong className="text-white text-sm">{weather.soilMoisture}%</strong>
        </div>
        <div className="bg-slate-950/60 rounded-lg p-2">
          <span className="text-slate-400 block">Abhi ka Risk</span>
          <strong className="text-sm">{risk.score}/100 • {risk.level}</strong>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-2">
        Data: Open-Meteo (free, bina key) • {weather.fetchedAt.toLocaleTimeString('en-IN')} par liya gaya • 30-din kul baarish: {weather.antecedentRainfall} mm
      </p>
    </div>
  );
};

export default LiveWeatherBadge;
