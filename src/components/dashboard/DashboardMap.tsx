import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Circle,
  CircleMarker,
  LayerGroup,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import { Layers } from 'lucide-react'
import type { ZoneWithScore } from '../types'
import { riskColor } from '../risk'
import { HISTORICAL_EVENTS } from '../../data/historicalEvents'
import type { EvacRoute } from '../../services/routes'
import type { Hospital } from '../../services/places'
import { ROUTE_COLORS } from './SafetyPanel'
import { ZoneSearch, RiskFilterChips, zonePassesFilter, type RiskFilter } from './MapControls'

interface DashboardMapProps {
  zones: ZoneWithScore[]
  onSelectZone: (zone: ZoneWithScore) => void
  onDeselectZone?: () => void
  evacRoutes?: EvacRoute[]
  evacHospital?: Hospital | null
  evacFrom?: { lat: number; lng: number } | null
}

const LAYERS = [
  { id: 'risk', label: 'Risk Zones' },
  { id: 'history', label: 'Historical Landslides' },
  { id: 'labels', label: 'Place Labels' },
  { id: 'routes', label: 'Evac Routes' },
] as const

type LayerId = (typeof LAYERS)[number]['id']

/**
 * Hero risk map for the dashboard: Esri satellite + live risk circles,
 * real historical landslide markers, evacuation routes, toggleable layers.
 */
export default function DashboardMap({
  zones,
  onSelectZone,
  onDeselectZone,
  evacRoutes = [],
  evacHospital = null,
  evacFrom = null,
}: DashboardMapProps) {
  // Layer options stay hidden behind the floating button until the user asks.
  const [open, setOpen] = useState(false)
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({
    risk: true,
    history: true,
    labels: true,
    routes: true,
  })
  const toggle = (id: LayerId) => setLayers((l) => ({ ...l, [id]: !l[id] }))
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('All')

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
    if (Date.now() - lastZoneClickAt.current > 200) onDeselectZone?.()
  }, [onDeselectZone])

  // Collapse the layer options when the user taps anywhere outside them.
  const layersRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (layersRef.current && !layersRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open ])

  const showRoutes = layers.routes && evacRoutes.length > 0

  // Fly to a zone picked from search (one-shot).
  const [flyTarget, setFlyTarget] = useState<ZoneWithScore | null>(null)
  const pickZone = useCallback(
    (zone: ZoneWithScore) => {
      setFlyTarget(zone)
      selectZone(zone)
    },
    [selectZone],
  )

  return (
    <div className="relative overflow-hidden rounded-[15px] border border-[#D9D9D9]">
      <MapContainer
        center={[26.8, 92.5]}
        zoom={6}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        className="h-[320px] w-full md:h-[420px]"
      >
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        {layers.labels ? (
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
        ) : null}
        <MapClickDeselect onMapClick={handleMapClick} />
        <FlyToSelected zone={flyTarget} />
        <ZoneSearch zones={zones} onPick={pickZone} />
        <RiskFilterChips value={riskFilter} onChange={setRiskFilter} />
        {layers.risk
          ? zones.filter((z) => zonePassesFilter(z, riskFilter)).map((zone) => {
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
                    pathOptions={{
                      fillColor: color,
                      fillOpacity: 0.28,
                      color,
                      weight: 1.5,
                      opacity: 0.85,
                    }}
                    eventHandlers={{ click: () => selectZone(zone) }}
                  />
                  <CircleMarker
                    center={[zone.location.lat, zone.location.lng]}
                    radius={9}
                    pathOptions={{ fillColor: color, fillOpacity: 0.9, color: '#F0F0F0', weight: 1 }}
                    eventHandlers={{ click: () => selectZone(zone) }}
                  />
                </LayerGroup>
              )
            })
          : null}
        {layers.history
          ? HISTORICAL_EVENTS.map((e, i) => (
              <CircleMarker
                key={i}
                center={[e.lat, e.lng]}
                radius={3.5}
                pathOptions={{ fillColor: '#FB923C', fillOpacity: 0.75, color: '#F0F0F0', weight: 0.5 }}
              />
            ))
          : null}
        {showRoutes
          ? evacRoutes.map((route, i) => (
              <Polyline
                key={route.label}
                positions={route.geometry.coordinates.map(
                  ([lng, lat]) => [lat, lng] as [number, number],
                )}
                pathOptions={{
                  color: ROUTE_COLORS[i % ROUTE_COLORS.length],
                  weight: 4,
                  opacity: 0.9,
                }}
              />
            ))
          : null}
        {showRoutes && evacHospital ? (
          <CircleMarker
            center={[evacHospital.lat, evacHospital.lng]}
            radius={9}
            pathOptions={{ fillColor: '#F87171', fillOpacity: 1, color: '#FFFFFF', weight: 2 }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              {evacHospital.name}
            </Tooltip>
          </CircleMarker>
        ) : null}
        {showRoutes && evacFrom ? (
          <CircleMarker
            center={[evacFrom.lat, evacFrom.lng]}
            radius={7}
            pathOptions={{ fillColor: '#38BDF6', fillOpacity: 1, color: '#FFFFFF', weight: 2 }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              Start: risk zone
            </Tooltip>
          </CircleMarker>
        ) : null}
      </MapContainer>

      <div ref={layersRef} className="absolute right-3 bottom-3 z-[500]">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Map layers"
            title="Map layers"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D9D9D9] bg-white/90 text-[#0F172A] backdrop-blur-sm transition-all duration-300 hover:bg-[#E9E9E9] active:scale-95"
          >
            <Layers className="h-5 w-5" aria-hidden="true" />
          </button>
          <div
            className={`absolute right-0 bottom-12 w-52 origin-bottom-right overflow-hidden rounded-xl border border-[#D9D9D9] bg-white/95 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)] backdrop-blur-sm transition-all duration-300 ease-out ${
              open
                ? 'visible translate-y-0 scale-100 opacity-100'
                : 'invisible pointer-events-none translate-y-2 scale-95 opacity-0'
            }`}
          >
            <div className="flex flex-col gap-1 px-3.5 py-2.5">
              {LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => toggle(layer.id)}
                  className="flex items-center justify-between py-1.5 text-left text-[14px] text-[#0F172A]"
                  role="switch"
                  aria-checked={layers[layer.id]}
                >
                  {layer.label}
                  <span
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                      layers[layer.id] ? 'bg-[#106EBE]' : 'bg-[#D9D9D9]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                        layers[layer.id] ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
              ))}
              <p className="pt-1 text-[13px] leading-relaxed text-[#64748B]">
                {HISTORICAL_EVENTS.length} recorded landslides (NASA GLC, 2007–2018)
              </p>
            </div>
          </div>
        </div>

      <div className="absolute bottom-3 left-3 z-[500] rounded-[15px] border border-[#D9D9D9] bg-white/90 px-3.5 py-2.5 backdrop-blur-sm shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
        <p className="mb-1.5 text-[13px] font-medium text-[#64748B]">Landslide Risk Level</p>
        <div className="flex flex-col gap-1">
          {[
            ['Low', '#34D399'],
            ['Moderate', '#FBBF24'],
            ['High', '#FB923C'],
            ['Critical', '#F87171'],
            ['Unknown', '#64748B'],
          ].map(([label, color]) => (
            <span key={label} className="inline-flex items-center gap-2 text-[13px] text-[#0F172A]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
        {showRoutes ? (
          <div className="mt-2 flex flex-col gap-1 border-t border-[#D9D9D9] pt-2">
            {evacRoutes.map((route, i) => (
              <span
                key={route.label}
                className="inline-flex items-center gap-2 text-[13px] text-[#0F172A]"
              >
                <span
                  className="h-0.5 w-4 rounded"
                  style={{ backgroundColor: ROUTE_COLORS[i % ROUTE_COLORS.length] }}
                />
                {route.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
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

/** One-shot smooth fly to a search-picked zone. */
function FlyToSelected({ zone }: { zone: ZoneWithScore | null }) {
  const map = useMap()
  const zoneId = zone?.location.id
  useEffect(() => {
    if (!zone) return
    map.flyTo([zone.location.lat, zone.location.lng], Math.max(map.getZoom(), 8), {
      duration: 1.1,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId])
  return null
}
