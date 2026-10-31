import { useCallback, useEffect, useRef, useState } from 'react'
import { Circle, CircleMarker, LayerGroup, MapContainer, ScaleControl, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import type { ZoneWithScore } from './types'
import { LevelBadge, RiskDot, riskColor } from './risk'
import { ZoneSearch, RiskFilterChips, zonePassesFilter, type RiskFilter } from './dashboard/MapControls'

interface MapViewProps {
  zones: ZoneWithScore[]
  loading: boolean
  onSelectZone: (zone: ZoneWithScore) => void
  onDeselectZone: () => void
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

/** Deselects the zone when the user taps empty map area (not a zone marker). */
function MapClickDeselect({ onMapClick }: { onMapClick: () => void }) {
  const map = useMap()
  const cb = useRef(onMapClick)
  cb.current = onMapClick
  useEffect(() => {
    const handler = () => cb.current()
    map.on('click', handler)
    return () => {
      map.off('click', handler)
    }
  }, [map])
  return null
}

const LEGEND: { level: string; label: string }[] = [
  { level: 'Low', label: 'Low' },
  { level: 'Moderate', label: 'Moderate' },
  { level: 'High', label: 'High' },
  { level: 'Critical', label: 'Critical' },
]

export default function MapView({ zones, loading, onSelectZone, onDeselectZone, selectedZone }: MapViewProps) {
  // Guard: a zone click also bubbles to the map — ignore map clicks that
  // arrive right after a zone click so selecting never instantly deselects.
  const lastZoneClickAt = useRef(0)
  const selectZone = useCallback(
    (zone: ZoneWithScore) => {
      lastZoneClickAt.current = Date.now()
      onSelectZone(zone)
    },
    [onSelectZone],
  )
  const handleMapClick = useCallback(() => {
    if (Date.now() - lastZoneClickAt.current > 200) onDeselectZone()
  }, [onDeselectZone])
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('All')
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[14px] font-medium text-[#64748B]">Show zones:</p>
        <RiskFilterChips value={riskFilter} onChange={setRiskFilter} />
      </div>
      <div className="relative overflow-hidden rounded-[15px] border border-[#D9D9D9]">
        <MapContainer
          center={[26.8, 92.5]}
          zoom={7}
          scrollWheelZoom
          zoomControl={false}
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
          <ZoomControl position="bottomright" />
          <MapAutoResize />
          <FlyToSelected zone={selectedZone} />
          <MapClickDeselect onMapClick={handleMapClick} />
          <ZoneSearch zones={zones} onPick={selectZone} />
          {zones.filter((z) => zonePassesFilter(z, riskFilter)).map((zone) => {
            const color = zone.prediction ? riskColor(zone.prediction.level) : '#64748B'
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
                    click: () => selectZone(zone),
                  }}
                />
                <CircleMarker
                  center={[zone.location.lat, zone.location.lng]}
                  radius={9}
                  pathOptions={{ fillColor: color, fillOpacity: 0.9, color: '#F0F0F0', weight: 1 }}
                  eventHandlers={{
                    click: () => selectZone(zone),
                  }}
                />
              </LayerGroup>
            )
          })}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
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
            <span className="text-[14px] text-[#0F172A]">{item.label} zone</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-2">
          <span
            className="h-4 w-4 rounded-full border-2 border-[#64748B] bg-[#64748B]/30"
            aria-hidden="true"
          />
          <span className="text-[14px] text-[#64748B]">Data unavailable</span>
        </span>
      </div>

      <div className="rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
        <p className="mb-4 text-[18px] font-bold text-[#0F172A]">Zones</p>
        {loading ? <p className="mb-3 text-[14px] text-[#64748B]">Loading live data…</p> : null}
        <div className="flex flex-col">
          {zones.map((zone) => (
            <button
              key={zone.location.id}
              type="button"
              onClick={() => onSelectZone(zone)}
              className="flex w-full items-center gap-3 border-b border-[#D9D9D9] py-3 text-left transition-colors last:border-b-0 last:pb-0 first:pt-0 hover:bg-[#E9E9E9]/50 active:bg-[#D9D9D9]"
            >
              <RiskDot level={zone.prediction?.level} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-[#0F172A]" title={zone.location.name}>
                  {zone.location.name}
                </span>
                <span className="block truncate text-[14px] text-[#64748B]" title={zone.location.state}>{zone.location.state}</span>
              </span>
              <span className="shrink-0 text-[14px] font-bold whitespace-nowrap text-[#0F172A]">
                {zone.prediction ? Math.round(zone.prediction.score) : '—'}
              </span>
              {zone.prediction ? (
                <span className="shrink-0">
                  <LevelBadge level={zone.prediction.level} />
                </span>
              ) : (
                <span className="shrink-0 text-[13px] font-medium text-[#64748B]">Data unavailable</span>
              )}
            </button>
          ))}
        </div>
        {zones.length === 0 && !loading ? (
          <p className="text-[14px] text-[#64748B]">No zones available.</p>
        ) : null}
      </div>
    </div>
  )
}
