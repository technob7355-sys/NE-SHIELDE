import { useEffect } from 'react'
import { Circle, CircleMarker, LayerGroup, MapContainer, ScaleControl, TileLayer, useMap } from 'react-leaflet'
import type { ZoneWithScore } from './types'
import { LevelBadge, RiskDot, riskColor } from './risk'

interface MapViewProps {
  zones: ZoneWithScore[]
  loading: boolean
  onSelectZone: (zone: ZoneWithScore) => void
  selectedZone: ZoneWithScore | null
}

/** Keeps Leaflet sized to its container while the detail panel animates open/closed. */
function MapAutoResize() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    if (!('ResizeObserver' in window)) return
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: true })
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [map])
  return null
}

/** Smoothly flies the map to the selected zone on every selection change. */
function FlyToSelected({ zone }: { zone: ZoneWithScore | null }) {
  const map = useMap()
  const zoneId = zone?.location.id
  useEffect(() => {
    if (!zone) return
    map.flyTo([zone.location.lat, zone.location.lng], Math.max(map.getZoom(), 8), {
      duration: 1.1,
    })
    // Fly only when the selection changes, not on every zone-data refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId])
  return null
}

const LEGEND: { level: string; label: string }[] = [
  { level: 'Low', label: 'Low' },
  { level: 'Moderate', label: 'Moderate' },
  { level: 'High', label: 'High' },
  { level: 'Critical', label: 'Critical' },
]

export default function MapView({ zones, loading, onSelectZone, selectedZone }: MapViewProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-xl border border-(--border)">
        <MapContainer
          center={[26.8, 92.5]}
          zoom={7}
          scrollWheelZoom
          zoomSnap={0.25}
          zoomDelta={0.5}
          wheelPxPerZoomLevel={110}
          zoomAnimation
          fadeAnimation
          markerZoomAnimation
          inertia
          inertiaDeceleration={2600}
          easeLinearity={0.15}
          className="h-[360px] w-full md:h-[520px]"
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
            attribution=""
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; OpenStreetMap contributors"
          />
          <ScaleControl position="bottomleft" imperial={false} />
          <MapAutoResize />
          <FlyToSelected zone={selectedZone} />
          {zones.map((zone) => {
            const color = zone.prediction ? riskColor(zone.prediction.level) : '#8CA0B8'
            return (
              <LayerGroup key={zone.location.id}>
                <Circle
                  center={[zone.location.lat, zone.location.lng]}
                  radius={38000}
                  pathOptions={{ fillColor: color, fillOpacity: 0.1, stroke: false }}
                />
                <Circle
                  center={[zone.location.lat, zone.location.lng]}
                  radius={25000}
                  pathOptions={{ fillColor: color, fillOpacity: 0.28, color, weight: 1.5, opacity: 0.85 }}
                  eventHandlers={{
                    click: () => onSelectZone(zone),
                  }}
                />
                <CircleMarker
                  center={[zone.location.lat, zone.location.lng]}
                  radius={9}
                  pathOptions={{ fillColor: color, fillOpacity: 0.9, color: '#0B1220', weight: 1 }}
                  eventHandlers={{
                    click: () => onSelectZone(zone),
                  }}
                />
              </LayerGroup>
            )
          })}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-(--border) bg-(--surface) p-5">
        {LEGEND.map((item) => (
          <span key={item.level} className="inline-flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-full border-2"
              style={{
                backgroundColor: `color-mix(in srgb, ${riskColor(item.level)} 30%, transparent)`,
                borderColor: riskColor(item.level),
              }}
              aria-hidden="true"
            />
            <span className="text-[13px] text-(--text)">{item.label} zone</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-2">
          <span
            className="h-4 w-4 rounded-full border-2 border-(--muted) bg-(--muted)/30"
            aria-hidden="true"
          />
          <span className="text-[13px] text-(--muted)">Data unavailable</span>
        </span>
      </div>

      <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
        <p className="mb-4 text-[16px] font-bold text-(--text)">Zones</p>
        {loading ? <p className="mb-3 text-[14px] text-(--muted)">Loading live data…</p> : null}
        <div className="flex flex-col">
          {zones.map((zone) => (
            <button
              key={zone.location.id}
              type="button"
              onClick={() => onSelectZone(zone)}
              className="flex w-full items-center gap-3 border-b border-(--border) py-3 text-left transition-colors last:border-b-0 last:pb-0 first:pt-0 hover:bg-(--surface-2)/50 active:bg-(--border)"
            >
              <RiskDot level={zone.prediction?.level} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-(--text)">
                  {zone.location.name}
                </span>
                <span className="block truncate text-[12px] text-(--muted)">{zone.location.state}</span>
              </span>
              <span className="shrink-0 text-[14px] font-bold whitespace-nowrap text-(--text)">
                {zone.prediction ? Math.round(zone.prediction.score) : '—'}
              </span>
              {zone.prediction ? (
                <span className="shrink-0">
                  <LevelBadge level={zone.prediction.level} />
                </span>
              ) : (
                <span className="shrink-0 text-[12px] font-medium text-(--muted)">Data unavailable</span>
              )}
            </button>
          ))}
        </div>
        {zones.length === 0 && !loading ? (
          <p className="text-[14px] text-(--muted)">No zones available.</p>
        ) : null}
      </div>
    </div>
  )
}
