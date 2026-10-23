import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import type { ZoneWithScore } from './types'
import { LevelBadge, RiskDot, riskColor } from './risk'

interface MapViewProps {
  zones: ZoneWithScore[]
  loading: boolean
  onSelectZone: (zone: ZoneWithScore) => void
}

const LEGEND: { level: string; label: string }[] = [
  { level: 'Low', label: 'Low' },
  { level: 'Moderate', label: 'Moderate' },
  { level: 'High', label: 'High' },
  { level: 'Critical', label: 'Critical' },
]

export default function MapView({ zones, loading, onSelectZone }: MapViewProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-xl border border-[#1E2D47]">
        <MapContainer
          center={[26.8, 92.5]}
          zoom={7}
          scrollWheelZoom
          className="h-[360px] w-full md:h-[520px]"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {zones.map((zone) => {
            const color = zone.prediction ? riskColor(zone.prediction.level) : '#8CA0B8'
            return (
              <CircleMarker
                key={zone.location.id}
                center={[zone.location.lat, zone.location.lng]}
                radius={9}
                pathOptions={{ fillColor: color, fillOpacity: 0.85, color: '#0B1220', weight: 1 }}
                eventHandlers={{
                  click: () => onSelectZone(zone),
                }}
              >
                <Popup>
                  <div>
                    <p className="font-bold text-[#E8EEF7]">{zone.location.name}</p>
                    <p className="text-[#8CA0B8]">{zone.location.state}</p>
                    <p className="mt-1 text-[#E8EEF7]">
                      Score: {zone.prediction ? Math.round(zone.prediction.score) : '—'}
                      {zone.prediction ? ` • ${zone.prediction.level}` : ''}
                    </p>
                    <p className="text-[#E8EEF7]">
                      Rain 24h: {zone.weather ? `${zone.weather.rainfall.toFixed(1)} mm` : '—'}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
        {LEGEND.map((item) => (
          <span key={item.level} className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: riskColor(item.level) }}
              aria-hidden="true"
            />
            <span className="text-[13px] text-[#E8EEF7]">{item.label}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#8CA0B8]" aria-hidden="true" />
          <span className="text-[13px] text-[#8CA0B8]">Data unavailable</span>
        </span>
      </div>

      <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
        <p className="mb-4 text-[16px] font-bold text-[#E8EEF7]">Zones</p>
        {loading ? <p className="mb-3 text-[14px] text-[#8CA0B8]">Loading live data…</p> : null}
        <div className="flex flex-col">
          {zones.map((zone) => (
            <button
              key={zone.location.id}
              type="button"
              onClick={() => onSelectZone(zone)}
              className="flex w-full items-center gap-3 border-b border-[#1E2D47] py-3 text-left last:border-b-0 last:pb-0 first:pt-0"
            >
              <RiskDot level={zone.prediction?.level} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-[#E8EEF7]">
                  {zone.location.name}
                </span>
                <span className="block truncate text-[12px] text-[#8CA0B8]">{zone.location.state}</span>
              </span>
              <span className="shrink-0 text-[14px] font-bold whitespace-nowrap text-[#E8EEF7]">
                {zone.prediction ? Math.round(zone.prediction.score) : '—'}
              </span>
              {zone.prediction ? (
                <span className="shrink-0">
                  <LevelBadge level={zone.prediction.level} />
                </span>
              ) : (
                <span className="shrink-0 text-[12px] font-medium text-[#8CA0B8]">Data unavailable</span>
              )}
            </button>
          ))}
        </div>
        {zones.length === 0 && !loading ? (
          <p className="text-[14px] text-[#8CA0B8]">No zones available.</p>
        ) : null}
      </div>
    </div>
  )
}
