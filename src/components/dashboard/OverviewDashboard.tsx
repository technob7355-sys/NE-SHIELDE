import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, CheckCircle2, CloudOff, FileText } from 'lucide-react'
import type { ZoneWithScore } from '../types'
import type { Alert } from '../../services/alerts'
import { fetchNearbyHospitals, type Hospital } from '../../services/places'
import { fetchEvacRoutes, type EvacRoute } from '../../services/routes'
import StatCards from './StatCards'
import DashboardMap from './DashboardMap'
import LocationDetails, { type SafetyPanelData } from './LocationDetails'
import type { HospitalsState, RoutesState } from './SafetyPanel'
import RainfallChart from './RainfallChart'
import OutlookChart from './OutlookChart'
import { LevelBadge, formatDateTimeIST, formatTimeIST, riskColor } from '../risk'
import { getStatus, LIFECYCLE_LABELS } from '../../services/alertStore'
import { loadReports, type HazardReport } from '../../services/reports'
import { haversineKm, zoneQuality } from '../../services/dataQuality'
import DataQualityBadge from './DataQualityBadge'

interface OverviewDashboardProps {
  zones: ZoneWithScore[]
  loading: boolean
  focusZone: ZoneWithScore | null
  alerts: Alert[]
  onSelectZone: (zone: ZoneWithScore) => void
  onDeselectZone: () => void
  onOpenMap: () => void
  /** Navigate to the Alerts tab for full review. Optional — Review falls back to the nearest zone. */
  onOpenAlerts?: () => void
}

/**
 * TerraGuard-style command dashboard: stat cards, live risk map and the
 * focus-zone details. Alerts live on their own separate tab.
 */
export default function OverviewDashboard({
  zones,
  loading,
  focusZone,
  alerts,
  onSelectZone,
  onDeselectZone,
  onOpenMap,
  onOpenAlerts,
}: OverviewDashboardProps) {
  const rainZone = useMemo(() => {
    const scored = zones.filter((z) => z.weather && z.weather.recentHourlyRain.length > 0)
    return (
      [...scored].sort((a, b) => (b.weather?.rainfall ?? 0) - (a.weather?.rainfall ?? 0))[0] ?? null
    )
  }, [zones])

  const outlookZone = useMemo(() => {
    const scored = zones.filter((z) => z.outlook && z.outlook.length > 0)
    return (
      [...scored].sort(
        (a, b) =>
          Math.max(...(b.outlook?.map((d) => d.score) ?? [0])) -
          Math.max(...(a.outlook?.map((d) => d.score) ?? [0])),
      )[0] ?? null
    )
  }, [zones])
  const outlookDays = outlookZone?.outlook ?? []

  // Situation banner (§6.2): derived ONLY from real state — fresh High/Critical
  // zones, stale/unavailable data, or the calm state. Never invented, never an
  // official warning (model output only).
  const banner = useMemo(() => {
    if (loading || zones.length === 0) return null
    const qs = zones.map(zoneQuality)
    const urgent = zones.filter(
      (z, i) =>
        qs[i].status === 'fresh' &&
        (z.prediction?.level === 'High' || z.prediction?.level === 'Critical'),
    )
    const badData = qs.filter((q) => q.status === 'stale' || q.status === 'unavailable')
    if (urgent.length > 0) {
      return {
        tone: 'urgent' as const,
        text: `${urgent.length} location${urgent.length === 1 ? '' : 's'} require${urgent.length === 1 ? 's' : ''} urgent review`,
      }
    }
    if (badData.length > 0) {
      return {
        tone: 'warn' as const,
        text: `Weather data unavailable or stale for ${badData.length} zone${badData.length === 1 ? '' : 's'}`,
      }
    }
    return {
      tone: 'calm' as const,
      text: 'All monitored zones are below high-risk thresholds.',
    }
  }, [zones, loading])

  // Pending citizen hazard reports awaiting review (status new/pending_verification
  // in the per-browser lifecycle store). Unverified — never treated as events.
  const pendingReports = useMemo<HazardReport[]>(() => {
    try {
      return loadReports()
        .filter((r) => {
          const s = getStatus(r.id)
          return s === 'new' || s === 'pending_verification'
        })
        .slice(0, 5)
    } catch {
      return []
    }
  }, [zones, alerts])

  /** Review a report: full review lives on the Alerts tab; fallback selects the nearest zone. */
  const handleReviewReport = (r: HazardReport) => {
    if (onOpenAlerts) {
      onOpenAlerts()
      return
    }
    const { lat, lng } = r
    if (lat != null && lng != null && zones.length > 0) {
      const nearest = [...zones].sort(
        (a, b) =>
          haversineKm(lat, lng, a.location.lat, a.location.lng) -
          haversineKm(lat, lng, b.location.lat, b.location.lng),
      )[0]
      onSelectZone(nearest)
    }
  }

  // Current model alerts, newest first (top 5). Historical observations live on
  // the History tab — this list is clearly labeled as current model output.
  const recentAlerts = useMemo(
    () =>
      [...alerts]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5),
    [alerts],
  )
  const zoneById = useMemo(() => new Map(zones.map((z) => [z.location.id, z])), [zones])

  // Locations genuinely needing attention: zones at Moderate risk or worse,
  // plus zones with stale/unavailable data (never shown as safe). When nothing
  // qualifies, the section shows an honest "All clear" instead of low-risk rows.
  const needsAttention = useMemo(() => {
    const withQ = zones.map((z) => ({ z, q: zoneQuality(z) }))
    const risky = withQ
      .filter(({ z, q }) => {
        const lvl = z.prediction?.level
        return (
          q.status === 'fresh' && (lvl === 'Moderate' || lvl === 'High' || lvl === 'Critical')
        )
      })
      .sort((a, b) => (b.z.prediction?.score ?? 0) - (a.z.prediction?.score ?? 0))
    const badData = withQ
      .filter(({ q }) => q.status === 'stale' || q.status === 'unavailable')
      .slice(0, 3)
    return [...risky, ...badData]
  }, [zones])

  const zoneAlerts = useMemo(() => {
    const map = new Map<string, Alert[]>()
    for (const a of alerts) {
      const arr = map.get(a.zoneId) ?? []
      arr.push(a)
      map.set(a.zoneId, arr)
    }
    return map
  }, [alerts])

  // ---- Safety: nearby hospitals + evacuation routes (real data) ----
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [hospitalsState, setHospitalsState] = useState<HospitalsState>('loading')
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [routes, setRoutes] = useState<EvacRoute[]>([])
  const [routesState, setRoutesState] = useState<RoutesState>('idle')

  const safetyZoneId = focusZone?.location.id ?? null
  const focusRef = useRef(focusZone)
  focusRef.current = focusZone

  // Fetch hospitals whenever the focus zone changes. Stale responses are dropped.
  useEffect(() => {
    const zone = focusRef.current
    setSelectedHospital(null)
    setRoutes([])
    setRoutesState('idle')
    setHospitals([])
    if (!zone) {
      setHospitalsState('loading')
      return
    }
    let cancelled = false
    setHospitalsState('loading')
    const { lat, lng } = zone.location
    void fetchNearbyHospitals(lat, lng, 20).then((res) => {
      if (cancelled) return
      if (!res.ok) {
        setHospitalsState('error')
      } else if (res.hospitals.length === 0) {
        setHospitalsState('empty')
      } else {
        setHospitals(res.hospitals)
        setHospitalsState('ok')
      }
    })
    return () => {
      cancelled = true
    }
  }, [safetyZoneId])

  const handleSelectHospital = (hospital: Hospital) => {
    const zone = focusRef.current
    if (!zone) return
    const zoneId = zone.location.id
    setSelectedHospital(hospital)
    setRoutes([])
    setRoutesState('loading')
    void fetchEvacRoutes(zone.location.lat, zone.location.lng, hospital.lat, hospital.lng).then(
      (res) => {
        if (focusRef.current?.location.id !== zoneId) return
        if (!res.ok) {
          setRoutesState('error')
        } else if (res.routes.length === 0) {
          setRoutesState('empty')
        } else {
          setRoutes(res.routes)
          setRoutesState('ok')
        }
      },
    )
  }

  const handleClearHospital = () => {
    setSelectedHospital(null)
    setRoutes([])
    setRoutesState('idle')
  }

  const safety: SafetyPanelData = useMemo(
    () => ({
      hospitals,
      hospitalsState,
      selectedHospital,
      routes,
      routesState,
      onSelectHospital: handleSelectHospital,
      onClearHospital: handleClearHospital,
    }),
    [hospitals, hospitalsState, selectedHospital, routes, routesState],
  )

  const evacFrom = focusZone
    ? { lat: focusZone.location.lat, lng: focusZone.location.lng }
    : null

  return (
    <div className="relative">
      {/* Light ambient backdrop — soft color blend, dashboard tab only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl"
      >
        <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-[#106EBE]/10 blur-[110px]" />
        <div className="absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-[#2D72D2]/10 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/4 h-[420px] w-[520px] rounded-full bg-[#004F88]/10 blur-[120px]" />
      </div>
      <div className="relative z-10 flex flex-col gap-5">
        {loading ? <p className="text-[14px] text-[#64748B]">Loading live data…</p> : null}

        {/* Situation banner — derived from real state only (§6.2) */}
        {banner ? (
          <div
            role="status"
            className={`flex items-start gap-3 rounded-[15px] border px-5 py-3.5 ${
              banner.tone === 'urgent'
                ? 'border-[#F87171]/50 bg-[#F87171]/10'
                : banner.tone === 'warn'
                  ? 'border-[#FBBF24]/50 bg-[#FBBF24]/10'
                  : 'border-[#34D399]/40 bg-[#34D399]/10'
            }`}
          >
            {banner.tone === 'urgent' ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#F87171]" aria-hidden="true" />
            ) : banner.tone === 'warn' ? (
              <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-[#B45309]" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0E9F6E]" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-[#0F172A]">{banner.text}</p>
              <p className="mt-0.5 text-[13px] text-[#64748B]">
                Model-generated assessment — not an official government warning.
              </p>
            </div>
          </div>
        ) : null}

        <StatCards zones={zones} alerts={alerts} onSelectZone={onSelectZone} onOpenAlerts={onOpenAlerts} />

        {/* Image banner — Himachal slope scar, official-portal accent */}
        <div
          className="relative overflow-hidden rounded-[15px] border border-[#003A66] bg-[#004F88] bg-cover bg-center"
          style={{ backgroundImage: `url("https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Landslides_in_Himachal_Pradesh.jpg/1920px-Landslides_in_Himachal_Pradesh.jpg")` }}
        >
          <div
            className="absolute inset-0 bg-[linear-gradient(100deg,rgba(0,79,136,0.92)_20%,rgba(0,79,136,0.45)_60%,rgba(0,79,136,0.15))]"
            aria-hidden="true"
          />
          <div className="relative z-10 flex flex-col gap-1 p-5 md:p-6">
            <p className="text-[18px] font-bold text-white">Live monitoring across {zones.length} Northeast zones</p>
            <p className="max-w-xl text-[14px] leading-relaxed text-white/85">
              Open-Meteo rainfall and soil data, refreshed every 12 minutes — every zone scored,
              every miss shown honestly.
            </p>
          </div>
        </div>

        {needsAttention.length > 0 || pendingReports.length > 0 ? (
          <div className="rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
            <p className="mb-1 text-[18px] font-bold text-[#0F172A]">Needs Attention</p>
            <p className="mb-3 text-[14px] text-[#64748B]">
              Highest-risk zones first — zones with stale or missing data are listed, never assumed safe.
            </p>
            <div className="flex flex-col gap-2">
              {needsAttention.map(({ z, q }) => {
                const za = zoneAlerts.get(z.location.id) ?? []
                const worstAlert = za[0]
                return (
                  <button
                    key={z.location.id}
                    type="button"
                    onClick={() => onSelectZone(z)}
                    className="flex items-center gap-3 rounded-lg border border-[#D9D9D9] bg-[#F0F0F0] px-4 py-2.5 text-left transition-all hover:bg-[#D9D9D9]"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: z.prediction
                          ? riskColor(z.prediction.level)
                          : '#64748B',
                      }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-snug font-medium text-[#0F172A]">
                        {z.location.name}
                        <span className="ml-2 font-normal text-[#64748B]">{z.location.state}</span>
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-[#64748B]">
                        <DataQualityBadge status={q.status} />
                        {worstAlert ? (
                          <span style={{ color: riskColor(worstAlert.severity) }}>
                            {worstAlert.severity} alert
                          </span>
                        ) : null}
                      </span>
                    </span>
                    {z.prediction ? (
                      <LevelBadge level={z.prediction.level} />
                    ) : (
                      <span className="text-[13px] text-[#64748B]">Unknown</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Pending citizen hazard reports (§6.4) — unverified, never treated as confirmed events */}
            {pendingReports.length > 0 ? (
              <div className="mt-4 border-t border-[#D9D9D9] pt-4">
                <p className="mb-1 text-[15px] font-bold text-[#0F172A]">
                  Citizen reports awaiting review ({pendingReports.length})
                </p>
                <p className="mb-3 text-[13px] text-[#64748B]">
                  Unverified field reports — review them on the Alerts tab before acting.
                </p>
                <div className="flex flex-col gap-2">
                  {pendingReports.map((r) => {
                    const canReview = Boolean(onOpenAlerts) || (r.lat != null && r.lng != null)
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 rounded-lg border border-[#FBBF24]/40 bg-[#FFFBEB] px-4 py-2.5"
                      >
                        <FileText
                          className="h-4 w-4 shrink-0 text-[#B45309]"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] leading-snug font-medium text-[#0F172A]">
                            {r.type} — {r.location}
                          </span>
                          <span className="mt-0.5 block truncate text-[13px] text-[#64748B]">
                            {r.description}
                          </span>
                          <span className="mt-0.5 block text-[13px] text-[#64748B]">
                            {formatDateTimeIST(r.time)} IST • {LIFECYCLE_LABELS[getStatus(r.id)]}
                          </span>
                        </span>
                        {canReview ? (
                          <button
                            type="button"
                            onClick={() => handleReviewReport(r)}
                            className="shrink-0 rounded-lg border border-[#D9D9D9] bg-white px-3 py-1.5 text-[13px] font-medium text-[#0F172A] transition-all hover:bg-[#E9E9E9] active:scale-[0.98]"
                          >
                            Review
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
            <p className="mb-1 flex items-center gap-2 text-[18px] font-bold text-[#0F172A]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#34D399]/15">
                <Check className="h-4 w-4 text-[#0E9F6E]" aria-hidden="true" />
              </span>
              All clear
            </p>
            <p className="text-[14px] leading-relaxed text-[#64748B]">
              No zone needs attention right now — every monitored zone is at Low risk with fresh data.
            </p>
          </div>
        )}

        {/* Recent alerts (§6.6) — current model alerts only, clearly labeled. */}
        <div className="rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
          <p className="mb-1 text-[18px] font-bold text-[#0F172A]">Recent alerts</p>
          <p className="mb-3 text-[14px] text-[#64748B]">
            Current model alerts from live zone data — not official government warnings. Historical
            observations are on the History tab.
          </p>
          {recentAlerts.length === 0 ? (
            <p className="text-[14px] text-[#64748B]">No current alerts.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentAlerts.map((a) => {
                const z = zoneById.get(a.zoneId)
                const body = (
                  <>
                    <span
                      className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[12px] font-bold whitespace-nowrap"
                      style={{
                        backgroundColor: `${riskColor(a.severity)}26`,
                        color: riskColor(a.severity),
                      }}
                    >
                      {a.severity}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-snug font-medium text-[#0F172A]">
                        {a.title}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-[#64748B]">
                        {a.zoneName}
                        {z ? `, ${z.location.state}` : null} • {formatTimeIST(a.time)} IST •{' '}
                        {LIFECYCLE_LABELS[getStatus(a.id)]} • Source: NE-SHIELD model
                      </span>
                    </span>
                  </>
                )
                return z ? (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelectZone(z)}
                    title="Open zone details"
                    className="flex items-center gap-3 rounded-lg border border-[#D9D9D9] bg-[#F0F0F0] px-4 py-2.5 text-left transition-all hover:bg-[#D9D9D9]"
                  >
                    {body}
                  </button>
                ) : (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-lg border border-[#D9D9D9] bg-[#F0F0F0] px-4 py-2.5"
                  >
                    {body}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="overflow-hidden rounded-[15px] border border-[#D9D9D9] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D9D9] bg-white px-5 py-4">
              <div>
                <p className="text-[18px] font-bold text-[#0F172A]">Live Risk Map</p>
                <p className="mt-0.5 text-[13px] text-[#64748B]">
                  Satellite view • {zones.length} zones • tap a zone for details
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenMap}
                className="rounded-lg border border-[#D9D9D9] bg-white px-4 py-2 text-[14px] font-medium text-[#0F172A] transition-all duration-300 hover:bg-[#E9E9E9] active:scale-[0.98]"
              >
                Open full live map →
              </button>
            </div>
            <DashboardMap
              zones={zones}
              onSelectZone={onSelectZone}
              onDeselectZone={onDeselectZone}
              evacRoutes={routes}
              evacHospital={selectedHospital}
              evacFrom={evacFrom}
            />
          </div>
        </div>
        <LocationDetails
          zone={focusZone}
          onViewOnMap={onOpenMap}
          safety={safety}
          alerts={focusZone ? (zoneAlerts.get(focusZone.location.id) ?? []) : []}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="flex flex-col rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
          <p className="mb-1 text-[18px] font-bold text-[#0F172A]">Rainfall Trend (Last 24 Hours)</p>
          <p className="mb-3 text-[13px] text-[#64748B]">
            {rainZone ? `${rainZone.location.name} — wettest zone` : 'Waiting for live data'}
          </p>
          <div className="flex flex-1 flex-col justify-center">
            {rainZone ? (
              <RainfallChart values={rainZone.weather!.recentHourlyRain} />
            ) : (
              <p className="text-[14px] text-[#64748B]">No data yet.</p>
            )}
            {rainZone?.weather ? (
              <p className="mt-2 text-[12px] text-[#64748B]">
                Units: mm • Source: Open-Meteo • Last update:{' '}
                {formatTimeIST(rainZone.weather.fetchedAt)} IST
                {rainZone.weather.recentHourlyRain.length < 24
                  ? ` • ${rainZone.weather.recentHourlyRain.length} of 24 hourly readings (gaps shown, not filled)`
                  : null}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
          <p className="mb-1 text-[18px] font-bold text-[#0F172A]">Risk Outlook (Next 3 Days)</p>
          <p className="mb-3 text-[13px] text-[#64748B]">
            {outlookZone
              ? `${outlookZone.location.name} — highest forecast score`
              : 'Waiting for live data'}
          </p>
          <div className="flex flex-1 flex-col justify-center">
            {outlookDays.length > 0 ? (
              <OutlookChart days={outlookDays} />
            ) : (
              <p className="text-[14px] text-[#64748B]">No data yet.</p>
            )}
            {outlookZone?.weather ? (
              <p className="mt-2 text-[12px] text-[#64748B]">
                Risk score 0–100 • Source: Open-Meteo forecast • Last update:{' '}
                {formatTimeIST(outlookZone.weather.fetchedAt)} IST
              </p>
            ) : null}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
