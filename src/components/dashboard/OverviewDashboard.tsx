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
  selectedZone: ZoneWithScore | null
  onSelectZone: (zone: ZoneWithScore) => void
  onSelectZoneId: (zoneId: string) => void
  onDeselectZone: () => void
  onOpenMap: () => void
}

export default function OverviewDashboard({
  zones,
  loading,
  alerts,
  selectedZone,
  onSelectZone,
  onSelectZoneId,
  onDeselectZone,
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

  const safetyZoneId = selectedZone?.location.id ?? null
  const selectedRef = useRef(selectedZone)
  selectedRef.current = selectedZone

  // Fetch hospitals whenever the selected zone changes. Stale responses are dropped.
  useEffect(() => {
    const zone = selectedRef.current
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
    const zone = selectedRef.current
    if (!zone) return
    const zoneId = zone.location.id
    setSelectedHospital(hospital)
    setRoutes([])
    setRoutesState('loading')
    void fetchEvacRoutes(zone.location.lat, zone.location.lng, hospital.lat, hospital.lng).then(
      (res) => {
        if (selectedRef.current?.location.id !== zoneId) return
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

  const evacFrom = selectedZone
    ? { lat: selectedZone.location.lat, lng: selectedZone.location.lng }
    : null

  // Keep the last selected zone rendered while the panel slides out.
  const lastZoneRef = useRef<ZoneWithScore | null>(null)
  if (selectedZone) lastZoneRef.current = selectedZone
  const displayZone = selectedZone ?? lastZoneRef.current
  const panelVisible = selectedZone !== null

  return (
    <div className="relative -m-4 p-4 md:-m-6 md:p-6">
      {/* Full-bleed live map backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <DashboardMap zones={zones} onSelectZone={() => {}} background />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[#0B1220]/60" aria-hidden="true" />

      <div className="relative flex flex-col gap-5">
        {loading ? <p className="text-[14px] text-[#8CA0B8]">Loading live data…</p> : null}

        <StatCards zones={zones} />

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
          <div className="relative overflow-hidden">
            <DashboardMap
              zones={zones}
              onSelectZone={onSelectZone}
              onDeselectZone={onDeselectZone}
              selectedZoneId={selectedZone?.location.id ?? null}
              evacRoutes={routes}
              evacHospital={selectedHospital}
              evacFrom={evacFrom}
            />
            {/* Slide-in detail panel */}
            <div
              className={`absolute top-0 right-0 z-[800] h-full w-[380px] max-w-[92vw] transition-all duration-300 ease-out ${
                panelVisible
                  ? 'translate-x-0 opacity-100'
                  : 'pointer-events-none translate-x-full opacity-0'
              }`}
            >
              {displayZone ? (
                <div className="h-full bg-[#101A2E]/95 p-3 backdrop-blur-sm">
                  <LocationDetails
                    zone={displayZone}
                    onViewOnMap={onOpenMap}
                    onClose={onDeselectZone}
                    safety={safety}
                  />
                </div>
              ) : null}
            </div>
          </div>
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
    </div>
  )
}
