import { useEffect, useMemo, useRef, useState } from 'react'
import type { ZoneWithScore } from '../types'
import type { Alert } from '../../services/alerts'
import { fetchNearbyHospitals, type Hospital } from '../../services/places'
import { fetchEvacRoutes, type EvacRoute } from '../../services/routes'
import StatCards from './StatCards'
import DashboardMap from './DashboardMap'
import LocationDetails, { type SafetyPanelData } from './LocationDetails'
import type { HospitalsState, RoutesState } from './SafetyPanel'
import AlertsPanel from './AlertsPanel'
import RainfallChart from './RainfallChart'
import OutlookChart from './OutlookChart'

interface OverviewDashboardProps {
  zones: ZoneWithScore[]
  loading: boolean
  alerts: Alert[]
  focusZone: ZoneWithScore | null
  onSelectZone: (zone: ZoneWithScore) => void
  onSelectZoneId: (zoneId: string) => void
  onOpenMap: () => void
}

/**
 * TerraGuard-style command dashboard. Every number on this screen comes
 * from live Open-Meteo data or the real historical record — nothing simulated.
 */
export default function OverviewDashboard({
  zones,
  loading,
  alerts,
  focusZone,
  onSelectZone,
  onSelectZoneId,
  onOpenMap,
}: OverviewDashboardProps) {
  const rainZone = useMemo(() => {
    const scored = zones.filter((z) => z.weather && z.weather.recentHourlyRain.length > 0)
    return (
      [...scored].sort((a, b) => (b.weather?.rainfall ?? 0) - (a.weather?.rainfall ?? 0))[0] ?? null
    )
  }, [zones])

  const outlookDays = useMemo(() => {
    const scored = zones.filter((z) => z.outlook && z.outlook.length > 0)
    const worst = [...scored].sort(
      (a, b) =>
        Math.max(...(b.outlook?.map((d) => d.score) ?? [0])) -
        Math.max(...(a.outlook?.map((d) => d.score) ?? [0])),
    )[0]
    return worst?.outlook ?? []
  }, [zones])

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
    <div className="flex flex-col gap-5">
      {loading ? <p className="text-[14px] text-[#8CA0B8]">Loading live data…</p> : null}

      <StatCards zones={zones} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="overflow-hidden rounded-xl border border-[#1E2D47]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2D47] bg-[#101A2E] px-5 py-4">
              <div>
                <p className="text-[16px] font-bold text-[#E8EEF7]">Live Risk Map</p>
                <p className="mt-0.5 text-[12px] text-[#8CA0B8]">
                  Satellite view • 20 zones • tap a zone for details
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenMap}
                className="rounded-lg border border-[#1E2D47] bg-[#16233C] px-4 py-2 text-[13px] font-medium text-[#E8EEF7] transition-all duration-300 hover:bg-[#1E2D47] active:scale-[0.98]"
              >
                Open full live map →
              </button>
            </div>
            <DashboardMap
              zones={zones}
              onSelectZone={onSelectZone}
              evacRoutes={routes}
              evacHospital={selectedHospital}
              evacFrom={evacFrom}
            />
          </div>
        </div>
        <LocationDetails zone={focusZone} onViewOnMap={onOpenMap} safety={safety} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <AlertsPanel alerts={alerts} onSelectZone={onSelectZoneId} />

        <div className="flex flex-col rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
          <p className="mb-1 text-[16px] font-bold text-[#E8EEF7]">Rainfall Trend (Last 24 Hours)</p>
          <p className="mb-3 text-[12px] text-[#8CA0B8]">
            {rainZone ? `${rainZone.location.name} — wettest zone` : 'Waiting for live data'}
          </p>
          <div className="flex flex-1 items-center">
            {rainZone ? (
              <RainfallChart values={rainZone.weather!.recentHourlyRain} />
            ) : (
              <p className="text-[14px] text-[#8CA0B8]">No data yet.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
          <p className="mb-1 text-[16px] font-bold text-[#E8EEF7]">Risk Outlook (Next 3 Days)</p>
          <p className="mb-3 text-[12px] text-[#8CA0B8]">Highest forecast score across zones</p>
          <div className="flex flex-1 items-center">
            {outlookDays.length > 0 ? (
              <OutlookChart days={outlookDays} />
            ) : (
              <p className="text-[14px] text-[#8CA0B8]">No data yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
