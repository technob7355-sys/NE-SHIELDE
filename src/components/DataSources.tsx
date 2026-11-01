import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { fetchZoneWeather } from '../services/weather'
import { fetchNearbyHospitals } from '../services/places'
import { fetchEvacRoutes } from '../services/routes'
import { LOCATIONS } from '../data/locations'

/**
 * Data Source Health — real checks only, run live in the browser.
 *
 * Statuses:
 *   Healthy     — the check succeeded and was fast enough.
 *   Delayed     — the check succeeded but took longer than the slow threshold.
 *   Unavailable — the check failed with a clear error (HTTP error, DNS, all
 *                 endpoints refused). The dependent UI shows an honest
 *                 "unavailable" state in this case.
 *   Unknown     — the check was inconclusive (timed out, or the browser could
 *                 not determine what happened). We never claim failure OR
 *                 success here.
 *
 * This view NEVER claims backend or database health: NE-SHIELD is a 100%
 * static frontend. The backend row below is a deliberate "not applicable"
 * marker, not a health claim.
 */

type CheckStatus = 'checking' | 'healthy' | 'delayed' | 'unavailable' | 'unknown'

interface CheckResult {
  id: string
  status: CheckStatus
  latencyMs: number | null
  detail: string | null
  error: string | null
  checkedAt: string
}

interface LastSuccess {
  at: string
  latencyMs: number
}

const STORAGE_KEY = 'neshield:datasources:last-success'
const SLOW_THRESHOLD_MS = 8000

function readLastSuccess(): Record<string, LastSuccess> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, LastSuccess>
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function writeLastSuccess(id: string, at: string, latencyMs: number) {
  try {
    const all = readLastSuccess()
    all[id] = { at, latencyMs }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // localStorage unavailable — health still works, just no persistence.
  }
}

class TimeoutError extends Error {
  constructor(ms: number) {
    super(`timed out after ${Math.round(ms / 1000)}s`)
    this.name = 'TimeoutError'
  }
}

/** Race a promise against a timeout; timeouts reject with TimeoutError. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms)
  })
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

/** A probe of a tile image: onload = reachable, onerror = failed, timeout = inconclusive. */
function probeImage(url: string, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const timer = setTimeout(() => {
      img.onload = img.onerror = null
      reject(new TimeoutError(ms))
    }, ms)
    img.onload = () => {
      clearTimeout(timer)
      resolve()
    }
    img.onerror = () => {
      clearTimeout(timer)
      reject(new Error('tile image failed to load'))
    }
    img.src = url
  })
}

const ESRI_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/7/64/64'
const ARCHIVE_PROBE_URL =
  'https://archive-api.open-meteo.com/v1/archive?latitude=27.17&longitude=88.52&start_date=2022-06-01&end_date=2022-06-07&daily=precipitation_sum'

const PROBE_ZONE = LOCATIONS[0] // rz-1 — representative probe target

interface CheckDef {
  id: string
  name: string
  description: string
  expectedInterval: string
  run: () => Promise<{ latencyMs: number; detail: string }>
}

const CHECKS: CheckDef[] = [
  {
    id: 'openmeteo-forecast',
    name: 'Open-Meteo Forecast API',
    description: 'Live per-zone forecast + past 31 days (api.open-meteo.com). Same request the risk engine makes.',
    expectedInterval: 'every 12 minutes',
    run: async () => {
      const start = performance.now()
      const w = await withTimeout(fetchZoneWeather(PROBE_ZONE), 25000)
      const latencyMs = Math.round(performance.now() - start)
      return {
        latencyMs,
        detail: `fetched ${w.history.length} past days + ${w.forecast.length} forecast days for ${w.zoneId}`,
      }
    },
  },
  {
    id: 'openmeteo-archive',
    name: 'Open-Meteo Archive API',
    description: 'Historical ERA5 reanalysis (archive-api.open-meteo.com). Used for training data, not live scoring.',
    expectedInterval: 'on demand (training/backfill)',
    run: async () => {
      const start = performance.now()
      const res = await withTimeout(fetch(ARCHIVE_PROBE_URL), 20000)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await res.json()
      return { latencyMs: Math.round(performance.now() - start), detail: 'archive probe week 2022-06-01 → 2022-06-07 OK' }
    },
  },
  {
    id: 'esri-tiles',
    name: 'Esri World Imagery tiles',
    description: 'Satellite base-map tiles (server.arcgisonline.com). Probed with a real <img> load — no-cors HEAD is unreliable for tiles.',
    expectedInterval: 'per map view',
    run: async () => {
      const start = performance.now()
      await probeImage(ESRI_TILE_URL, 15000)
      return { latencyMs: Math.round(performance.now() - start), detail: 'tile z7 loaded' }
    },
  },
  {
    id: 'overpass',
    name: 'Overpass / OpenStreetMap (hospitals)',
    description: 'Nearby-hospital lookup via Overpass API. Failure is expected from sandboxes (406 blocks) — the zone panel shows "unavailable", never fake data.',
    expectedInterval: 'cached 30 minutes per zone',
    run: async () => {
      const start = performance.now()
      const r = await withTimeout(fetchNearbyHospitals(PROBE_ZONE.lat, PROBE_ZONE.lng, 20), 30000)
      const latencyMs = Math.round(performance.now() - start)
      if (!r.ok) throw new Error('all Overpass endpoints failed')
      return { latencyMs, detail: `${r.hospitals.length} facilities within 20 km of ${PROBE_ZONE.name}` }
    },
  },
  {
    id: 'osrm',
    name: 'OSRM routing (evacuation routes)',
    description: 'Driving-route lookup via the public OSRM demo server (router.project-osrm.org).',
    expectedInterval: 'per hospital selection',
    run: async () => {
      const start = performance.now()
      const r = await withTimeout(
        fetchEvacRoutes(PROBE_ZONE.lat, PROBE_ZONE.lng, PROBE_ZONE.lat + 0.08, PROBE_ZONE.lng + 0.08),
        20000,
      )
      const latencyMs = Math.round(performance.now() - start)
      if (!r.ok) throw new Error('OSRM returned no route')
      return { latencyMs, detail: `${r.routes.length} alternate routes computed` }
    },
  },
]

const STATUS_META: Record<CheckStatus, { label: string; color: string; bg: string }> = {
  checking: { label: 'Checking…', color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
  healthy: { label: 'Healthy', color: '#0E9F6E', bg: 'rgba(52,211,153,0.15)' },
  delayed: { label: 'Delayed', color: '#B45309', bg: 'rgba(251,191,36,0.18)' },
  unavailable: { label: 'Unavailable', color: '#DC2626', bg: 'rgba(248,113,113,0.15)' },
  unknown: { label: 'Unknown', color: '#475569', bg: 'rgba(148,163,184,0.18)' },
}

function classifyOutcome(
  id: string,
  latencyMs: number,
  detail: string,
): CheckResult {
  const checkedAt = new Date().toISOString()
  const status: CheckStatus = latencyMs > SLOW_THRESHOLD_MS ? 'delayed' : 'healthy'
  writeLastSuccess(id, checkedAt, latencyMs)
  return { id, status, latencyMs, detail, error: null, checkedAt }
}

function classifyFailure(id: string, e: unknown): CheckResult {
  const checkedAt = new Date().toISOString()
  const msg = e instanceof Error ? e.message : 'check failed'
  const status: CheckStatus = e instanceof TimeoutError ? 'unknown' : 'unavailable'
  return { id, status, latencyMs: null, detail: null, error: msg, checkedAt }
}

function formatAge(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ${min % 60}m ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function DataSources() {
  const [results, setResults] = useState<Record<string, CheckResult>>({})
  const [checking, setChecking] = useState(false)
  const mountedRef = useRef(true)
  const [lastSuccess, setLastSuccess] = useState<Record<string, LastSuccess>>({})

  const runAll = useCallback(async () => {
    setChecking(true)
    setLastSuccess(readLastSuccess())
    const next: Record<string, CheckResult> = {}
    for (const def of CHECKS) {
      const checkingRow: CheckResult = {
        id: def.id,
        status: 'checking',
        latencyMs: null,
        detail: null,
        error: null,
        checkedAt: new Date().toISOString(),
      }
      if (mountedRef.current) setResults((prev) => ({ ...prev, [def.id]: checkingRow }))
      try {
        const { latencyMs, detail } = await def.run()
        next[def.id] = classifyOutcome(def.id, latencyMs, detail)
      } catch (e) {
        next[def.id] = classifyFailure(def.id, e)
      }
      if (mountedRef.current) setResults((prev) => ({ ...prev, [def.id]: next[def.id] }))
    }
    if (mountedRef.current) {
      setChecking(false)
      setLastSuccess(readLastSuccess())
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void runAll()
    return () => {
      mountedRef.current = false
    }
  }, [runAll])

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
        <div className="flex flex-wrap items-center gap-2">
          <Activity className="h-4 w-4 text-[#004F88]" aria-hidden="true" />
          <p className="text-[18px] font-bold text-[#0F172A]">Data Source Health</p>
          <button
            type="button"
            onClick={() => void runAll()}
            disabled={checking}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[#D9D9D9] bg-white px-3 py-1.5 text-[13px] font-medium text-[#0F172A] transition-all hover:bg-[#E9E9E9] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} aria-hidden="true" />
            {checking ? 'Checking…' : 'Re-check'}
          </button>
        </div>
        <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-[#64748B]">
          Live reachability checks run <span className="font-medium text-[#0F172A]">in this browser</span> —
          real requests, real results. <span className="font-medium text-[#0F172A]">Unknown</span> means the
          check was inconclusive (timeout); it is never presented as success or failure.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {CHECKS.map((def) => {
          const r = results[def.id]
          const meta = STATUS_META[r?.status ?? 'checking']
          const prev = lastSuccess[def.id]
          return (
            <div
              key={def.id}
              className="rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-semibold"
                  style={{ color: meta.color, backgroundColor: meta.bg }}
                >
                  {meta.label}
                </span>
                <p className="text-[16px] font-bold text-[#0F172A]">{def.name}</p>
                {r?.latencyMs != null ? (
                  <span className="ml-auto text-[13px] text-[#64748B]">
                    {(r.latencyMs / 1000).toFixed(1)}s
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-[#64748B]">{def.description}</p>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-3">
                <div>
                  <dt className="text-[#94A3B8]">Expected interval</dt>
                  <dd className="font-medium text-[#0F172A]">{def.expectedInterval}</dd>
                </div>
                <div>
                  <dt className="text-[#94A3B8]">Last successful check</dt>
                  <dd className="font-medium text-[#0F172A]">
                    {prev ? `${formatAge(prev.at)} (${(prev.latencyMs / 1000).toFixed(1)}s)` : 'none recorded'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#94A3B8]">Last error</dt>
                  <dd className="font-medium text-[#0F172A]">
                    {r?.error ? <span style={{ color: '#DC2626' }}>{r.error}</span> : '—'}
                  </dd>
                </div>
              </dl>
              {r?.detail ? (
                <p className="mt-2 text-[13px] text-[#64748B]">
                  <span className="font-medium text-[#0E9F6E]">✓</span> {r.detail}
                </p>
              ) : null}
            </div>
          )
        })}

        <div className="rounded-[15px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-semibold"
              style={{ color: '#475569', backgroundColor: 'rgba(148,163,184,0.18)' }}
            >
              Not applicable
            </span>
            <p className="text-[16px] font-bold text-[#0F172A]">Backend / Database</p>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-[#64748B]">
            NE-SHIELD is a 100% static frontend — there is no server and no database, so no
            backend or DB health is claimed, measured, or implied. The API contract for a future
            backend lives in <span className="font-mono text-[12px]">docs/backend-api-spec.md</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
