import { Crosshair } from 'lucide-react'
import type { ZoneWithScore } from '../types'
import { LevelBadge, formatTimeIST } from '../risk'
import { countNearbyEvents } from '../../data/historicalEvents'
import SafetyPanel, { type HospitalsState, type RoutesState } from './SafetyPanel'
import type { Hospital } from '../../services/places'
import type { EvacRoute } from '../../services/routes'

export interface SafetyPanelData {
  hospitals: Hospital[]
  hospitalsState: HospitalsState
  selectedHospital: Hospital | null
  routes: EvacRoute[]
  routesState: RoutesState
  onSelectHospital: (hospital: Hospital) => void
  onClearHospital: () => void
}

interface LocationDetailsProps {
  zone: ZoneWithScore | null
  onViewOnMap: () => void
  safety: SafetyPanelData | null
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[13px] text-[#8CA0B8]">{label}</span>
      <span
        className={`text-[13px] font-medium whitespace-nowrap ${accent ? 'text-[#F87171]' : 'text-[#E8EEF7]'}`}
      >
        {value}
      </span>
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mt-4 mb-1 text-[11px] font-bold tracking-wider text-[#8CA0B8] uppercase">
      {children}
    </p>
  )
}

/** Right-hand detail panel for the focus zone. All values are real. */
export default function LocationDetails({ zone, onViewOnMap, safety }: LocationDetailsProps) {
  if (!zone) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-[#1E2D47] bg-[#101A2E] p-6">
        <p className="text-[14px] text-[#8CA0B8]">Waiting for live data…</p>
      </div>
    )
  }
  const { location, weather, prediction } = zone
  const nearby = countNearbyEvents(location.lat, location.lng, 25)

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="truncate text-[16px] font-bold text-[#E8EEF7]">Location Details</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-[#E8EEF7]">{location.name}</p>
            <p className="mt-0.5 text-[12px] text-[#8CA0B8]">{location.state}, India</p>
          </div>
          {prediction ? <LevelBadge level={prediction.level} /> : null}
        </div>

        <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-[#8CA0B8]">
          <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
          {location.lat.toFixed(4)}° N, {location.lng.toFixed(4)}° E
        </p>

        <SectionLabel>Risk &amp; Weather</SectionLabel>
        <div className="divide-y divide-[#1E2D47] border-y border-[#1E2D47]">
          <Row
            label="Predicted Risk"
            value={prediction ? `${prediction.level} (${Math.round(prediction.score)}%)` : '—'}
            accent={prediction?.level === 'Critical' || prediction?.level === 'High'}
          />
          <Row label="Current Rainfall" value={weather ? `${weather.rainfall.toFixed(1)} mm` : '—'} />
          <Row label="24h Rainfall" value={weather ? `${weather.rainfall.toFixed(1)} mm` : '—'} />
          <Row label="Slope Angle" value={`${location.slope}°`} />
          <Row label="Soil Moisture" value={weather ? `${weather.soilMoisture.toFixed(0)}%` : '—'} />
          <Row label="Historical Landslides" value={`${nearby} records (25 km)`} />
          <Row label="Last Updated" value={weather ? formatTimeIST(weather.fetchedAt) : '—'} />
        </div>

        {safety ? (
          <>
            <SectionLabel>Safety</SectionLabel>
            <SafetyPanel
              hospitals={safety.hospitals}
              hospitalsState={safety.hospitalsState}
              selectedHospital={safety.selectedHospital}
              routes={safety.routes}
              routesState={safety.routesState}
              onSelectHospital={safety.onSelectHospital}
              onClearHospital={safety.onClearHospital}
            />
          </>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onViewOnMap}
        className="mt-4 w-full shrink-0 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[14px] font-medium text-white transition-all duration-300 hover:bg-[#2563EB] active:scale-[0.98]"
      >
        View on Map
      </button>
      <p className="mt-2 shrink-0 text-[11px] leading-relaxed text-[#8CA0B8]">
        Historical counts from NASA GLC/COOLR (2007–2018).
      </p>
    </div>
  )
}
