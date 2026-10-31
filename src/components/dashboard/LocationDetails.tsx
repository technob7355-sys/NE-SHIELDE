import { Crosshair } from 'lucide-react'
import type { ZoneWithScore } from '../types'
import type { Alert } from '../../services/alerts'
import { LevelBadge, formatTimeIST, riskColor } from '../risk'
import { countNearbyEvents } from '../../data/historicalEvents'
import { nearestEvents, zoneQuality } from '../../services/dataQuality'
import DataQualityBadge from './DataQualityBadge'
import Recommendations from './Recommendations'
import SafetyPanel, { type HospitalsState, type RoutesState } from './SafetyPanel'
import type { Hospital } from '../../services/places'
import type { EvacRoute } from '../../services/routes'
import { worstLevel, levelRank } from '../../ml/model'

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
  alerts: Alert[]
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[14px] text-[#8CA0B8]">{label}</span>
      <span
        className={`text-right text-[14px] font-medium whitespace-nowrap ${accent ? 'text-[#F87171]' : 'text-[#E8EEF7]'}`}
      >
        {value}
      </span>
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mt-4 mb-1 text-[13px] font-bold tracking-wider text-[#8CA0B8] uppercase">
      {children}
    </p>
  )
}

/** Operational location panel: risk, data quality, forecast, alerts, guidance. */
export default function LocationDetails({ zone, onViewOnMap, safety, alerts }: LocationDetailsProps) {
  if (!zone) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-[#1E2D47] bg-[#101A2E] p-6">
        <p className="text-[14px] text-[#8CA0B8]">Select a zone on the map for details.</p>
      </div>
    )
  }
  const { location, weather, prediction } = zone
  const quality = zoneQuality(zone)
  const nearby = countNearbyEvents(location.lat, location.lng, 25)
  const nearest = nearestEvents(location.lat, location.lng, 3, 60)

  const worstOutlook =
    zone.outlook && zone.outlook.length > 0
      ? worstLevel(zone.outlook.map((d) => d.level))
      : null
  const outlookRain =
    zone.outlook && zone.outlook.length > 0
      ? Math.max(...zone.outlook.map((d) => d.rainfall))
      : null
  const rising =
    worstOutlook && prediction && levelRank(worstOutlook) > levelRank(prediction.level)

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-[18px] font-bold text-[#E8EEF7]">Location Details</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[16px] leading-snug font-bold text-[#E8EEF7]">{location.name}</p>
            <p className="mt-0.5 text-[14px] text-[#8CA0B8]">{location.state}, India</p>
          </div>
          {prediction ? <LevelBadge level={prediction.level} /> : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <DataQualityBadge
            status={quality.status}
            detail={
              quality.fetchedAt
                ? `Last successful fetch ${formatTimeIST(quality.fetchedAt)} IST (${quality.ageMin} min ago)`
                : undefined
            }
          />
          {quality.fetchedAt ? (
            <span className="text-[13px] text-[#8CA0B8]">
              {formatTimeIST(quality.fetchedAt)} IST
            </span>
          ) : null}
        </div>

        <p className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-[#8CA0B8]">
          <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
          {location.lat.toFixed(4)}° N, {location.lng.toFixed(4)}° E
        </p>

        {alerts.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {alerts.slice(0, 3).map((a) => (
              <span
                key={a.id}
                className="rounded-full px-2 py-0.5 text-[12px] font-bold"
                style={{
                  backgroundColor: `${riskColor(a.severity)}22`,
                  color: riskColor(a.severity),
                }}
              >
                {a.severity} alert active
              </span>
            ))}
          </div>
        ) : null}

        <SectionLabel>Risk &amp; Weather</SectionLabel>
        <div className="divide-y divide-[#1E2D47] border-y border-[#1E2D47]">
          <Row
            label="Predicted Risk"
            value={
              prediction
                ? `${prediction.level} (${Math.round(prediction.score)})`
                : quality.status === 'unavailable'
                  ? 'Unknown — no data'
                  : '—'
            }
            accent={prediction?.level === 'Critical' || prediction?.level === 'High'}
          />
          <Row label="24h Rainfall" value={weather ? `${weather.rainfall.toFixed(1)} mm` : '—'} />
          <Row label="3-Day Forecast" value={
            worstOutlook
              ? `${worstOutlook}${rising ? ' ↑ rising' : ''} · ${outlookRain?.toFixed(0)} mm max`
              : '—'
          } />
          <Row label="Slope Angle" value={`${location.slope}°`} />
          <Row label="Soil Moisture" value={weather ? `${weather.soilMoisture.toFixed(0)}%` : '—'} />
          <Row label="Historical Landslides" value={`${nearby} records (25 km)`} />
          <Row label="Last Updated" value={weather ? formatTimeIST(weather.fetchedAt) : '—'} />
        </div>

        {nearest.length > 0 ? (
          <>
            <SectionLabel>Nearest Past Events</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {nearest.map((e, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 text-[14px]"
                >
                  <span className="min-w-0 text-[#E8EEF7]">{e.name}</span>
                  <span className="shrink-0 text-[#8CA0B8]">
                    {e.date} · {e.distanceKm.toFixed(0)} km
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className="mt-4">
          <Recommendations level={prediction?.level ?? null} quality={quality.status} />
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
      <p className="mt-2 shrink-0 text-[13px] leading-relaxed text-[#8CA0B8]">
        Historical counts from NASA GLC/COOLR (2007–2018).
      </p>
    </div>
  )
}
