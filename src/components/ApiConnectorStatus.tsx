import React, { useCallback, useEffect, useState } from 'react';
import { PlugZap, RefreshCw, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { RiskZone } from '../types';
import type { Provenance } from '../services/provenance';

/**
 * ApiConnectorStatus — VISIBLE API Connector Bar (V3)
 * =====================================================
 * Dashboard par saaf dikhega ki kaunsa API connector sach me
 * chal raha hai aur kaunsa fail hai. Koi hardcoded time nahi —
 * "last fetch" wahi time hai jab asli fetch response pura hua.
 *
 * Do connectors:
 *  1) Open-Meteo LIVE Forecast API  (abhi ka mausam)
 *  2) Open-Meteo ARCHIVE API         (purana mausam — V3 model
 *     training + backtest ke liye yahi use hua hai)
 *
 * Dono ke liye halki (lightweight) real fetch NH-10 coordinates
 * (27.17, 88.52) par jaati hai. Fail ho to laal dot + asli error,
 * aur saaf likha jayega ki juda hua data MOCK label ke saath dikhega.
 */

export const FORECAST_API_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=27.17&longitude=88.52' +
  '&hourly=precipitation&past_days=1&forecast_days=1&timezone=Asia%2FKolkata';

export const ARCHIVE_API_URL =
  'https://archive-api.open-meteo.com/v1/archive?latitude=27.17&longitude=88.52' +
  '&start_date=2022-06-01&end_date=2022-06-07&daily=precipitation_sum&timezone=Asia%2FKolkata';

interface ConnectorState {
  id: 'forecast' | 'archive';
  label: string;
  detail: string;
  url: string;
  status: 'checking' | 'ok' | 'fail';
  /** Asli fetch pura hone ka time — sirf response aane ke baad set hota hai */
  fetchedAt: Date | null;
  latencyMs: number | null;
  error: string;
}

const INITIAL_CONNECTORS: ConnectorState[] = [
  {
    id: 'forecast',
    label: 'Open-Meteo LIVE Forecast API',
    detail: 'Abhi ka live mausam (baarish) — Simple View ke live cards isi se bante hain',
    url: FORECAST_API_URL,
    status: 'checking',
    fetchedAt: null,
    latencyMs: null,
    error: '',
  },
  {
    id: 'archive',
    label: 'Open-Meteo ARCHIVE API',
    detail: 'Purana mausam (ERA5) — V3 model ki training aur backtest ka data isi se aaya',
    url: ARCHIVE_API_URL,
    status: 'checking',
    fetchedAt: null,
    latencyMs: null,
    error: '',
  },
];

async function checkConnector(c: ConnectorState): Promise<ConnectorState> {
  const started = performance.now();
  try {
    const res = await fetch(c.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: unknown = await res.json();
    if (!data || typeof data !== 'object') throw new Error('API se khaali / galat jawab aaya');
    return {
      ...c,
      status: 'ok',
      fetchedAt: new Date(), // response pura hone ka ASLI time
      latencyMs: Math.round(performance.now() - started),
      error: '',
    };
  } catch (err) {
    return {
      ...c,
      status: 'fail',
      fetchedAt: new Date(), // koshish puri hone ka time — status 'fail' ke saath hi dikhega
      latencyMs: Math.round(performance.now() - started),
      error: err instanceof Error ? err.message : 'Fetch fail ho gaya',
    };
  }
}

export interface ApiConnectorStatusProps {
  /** Jis zone ka provenance dikhana hai (optional) */
  selectedZone?: RiskZone | null;
  /** Selected zone ka provenance stamp (optional) — App fetch karke deta hai */
  provenance?: Provenance | null;
}

export const ApiConnectorStatus: React.FC<ApiConnectorStatusProps> = ({
  selectedZone,
  provenance,
}) => {
  const [connectors, setConnectors] = useState<ConnectorState[]>(INITIAL_CONNECTORS);
  const [checking, setChecking] = useState<boolean>(false);

  const runChecks = useCallback(async () => {
    setChecking(true);
    setConnectors((prev) => prev.map((c) => ({ ...c, status: 'checking' as const })));
    const results = await Promise.all(INITIAL_CONNECTORS.map((c) => checkConnector(c)));
    setConnectors(results);
    setChecking(false);
  }, []);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  const anyFail = connectors.some((c) => c.status === 'fail');

  return (
    <section
      className="rounded-2xl border border-slate-700 bg-[#0b1326] shadow-xl p-4"
      aria-label="API Connector Status"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-black text-white flex items-center gap-2">
          <PlugZap className="w-4 h-4 text-cyan-400" />
          API Connectors — Sach me jude hain ya nahi?
          <span className="text-[10px] font-mono font-normal text-slate-400">
            (check NH-10: 27.17, 88.52 par real fetch se hota hai)
          </span>
        </h2>
        <button
          onClick={() => void runChecks()}
          disabled={checking}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-200 text-[11px] font-bold border border-slate-700"
        >
          <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
          Dobara Check Karo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        {connectors.map((c) => (
          <div
            key={c.id}
            className={`p-3.5 rounded-xl border ${
              c.status === 'ok'
                ? 'bg-emerald-950/30 border-emerald-800'
                : c.status === 'fail'
                  ? 'bg-red-950/30 border-red-800'
                  : 'bg-slate-900/70 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  c.status === 'ok'
                    ? 'bg-emerald-400 animate-pulse'
                    : c.status === 'fail'
                      ? 'bg-red-500'
                      : 'bg-slate-500 animate-pulse'
                }`}
                aria-hidden="true"
              />
              <span className="text-xs font-black text-white">{c.label}</span>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  c.status === 'ok'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : c.status === 'fail'
                      ? 'bg-red-950 text-red-300 border-red-700'
                      : 'bg-slate-800 text-slate-300 border-slate-600'
                }`}
              >
                {c.status === 'ok' ? '🟢 LIVE / CONNECTED' : c.status === 'fail' ? '🔴 FAIL' : '… CHECK HO RAHA HAI'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">{c.detail}</p>
            <div className="text-[11px] font-mono text-slate-300 mt-2 space-y-0.5">
              {c.status === 'checking' && <p>Fetch ho raha hai… abhi koi time nahi dikhayenge (nakli time nahi banta).</p>}
              {c.status !== 'checking' && c.fetchedAt && (
                <p>
                  {c.status === 'ok' ? 'Last fetch (asli):' : 'Last koshish (fail):'}{' '}
                  <strong className="text-white">{c.fetchedAt.toLocaleString('en-IN')}</strong>
                  {c.latencyMs !== null && <span> • Latency: {c.latencyMs} ms</span>}
                </p>
              )}
              {c.status === 'fail' && (
                <p className="text-red-300 flex items-start gap-1 font-sans">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Error: {c.error}. Is connector ka data abhi LIVE nahi hai — jahan ye data
                    use hoga, wahan <strong>MOCK</strong> label saaf dikhega.
                  </span>
                </p>
              )}
            </div>
            <a
              href={c.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-cyan-300 underline break-all"
            >
              Source URL khud khol ke check karo <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        ))}
      </div>

      {anyFail && (
        <p className="mt-3 text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800 rounded-lg px-3 py-2">
          ⚠️ Ek ya zyada connector fail hai. Iska matlab: usse juda data is samay LIVE nahi hai —
          dashboard ke baaki hisse me aise number <strong>MOCK DATA</strong> stamp ke saath dikhenge.
        </p>
      )}

      {/* Selected zone ka provenance sub-panel */}
      {selectedZone && (
        <div className="mt-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-700">
          <p className="text-xs font-black text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Selected Zone Provenance — {selectedZone.name}
          </p>
          {provenance ? (
            <div className="text-[11px] text-slate-300 mt-1.5 space-y-1">
              <p>
                Source: <strong className="text-white">{provenance.sourceName}</strong> •{' '}
                {provenance.isLive ? (
                  <span className="text-emerald-300 font-bold">🟢 LIVE</span>
                ) : (
                  <span className="text-amber-300 font-bold">🟠 LIVE NAHI — MOCK data chal raha hai</span>
                )}
              </p>
              <p>
                Fetched at: <span className="font-mono">{new Date(provenance.fetchedAtISO).toLocaleString('en-IN')}</span>
                {provenance.isLive && (
                  <>
                    {' '}• Raw: baarish {provenance.rawRainfallMm} mm • 3-din {provenance.threeDayRainfallMm} mm • 30-din{' '}
                    {provenance.antecedentRainfallMm} mm • mitti raw {provenance.rawSoilRaw} m³/m³ → {provenance.convertedSoilPct}%
                  </>
                )}
              </p>
              {provenance.hash && (
                <p className="font-mono text-[10px] text-slate-400">
                  Data hash (angutha-nishan): {provenance.hash} • {provenance.hourlyRowsCount} hourly rows
                </p>
              )}
              {!provenance.isLive && provenance.error && (
                <p className="text-red-300">Error: {provenance.error}</p>
              )}
              <a
                href={provenance.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-cyan-300 font-bold underline break-all"
              >
                Provenance source URL <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1.5">
              Is zone ka provenance abhi load nahi hua. Live fetch hote hi source, time, raw values
              aur hash yahan dikhega. Tab tak is zone ke number <strong className="text-amber-300">MOCK</strong> samjho.
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default ApiConnectorStatus;
