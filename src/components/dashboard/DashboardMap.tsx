import { useEffect, useRef, useState } from 'react'
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

interface DashboardMapProps {
  zones: ZoneWithScore[]
  onSelectZone: (zone: ZoneWithScore) => void
  onDeselectZone?: () => void
  selectedZoneId?: string | null
  evacRoutes?: EvacRoute[]
  evacHospital?: Hospital | null
  evacFrom?: { lat: number; lng: number } | null
  /** Backdrop mode: non-interactive, no chrome, fills its parent. */
  background?: boolean
}

const LAYERS = [
  { id: 'risk', label: 'Risk Zones' },
  { id: 'history', label: 'Historical Landslides' },
  { id: 'labels', label: 'Place Labels' },
  { id: 'routes', label: 'Evac Routes' },
] as const

type LayerId = (typeof LAYERS)[number]['id']

/**
 * Registers a map-level click handler. Used to clear the zone selection
 * when the user clicks empty map area (zone clicks are guarded by timestamp).
 */
function MapClickDeselect({ onClick }: { onClick: () => void }) {
  const map = useMap()
  const handlerRef = useRef(onClick)
  handlerRef.current = onClick
  useEffect(() => {
    const handler = () => handlerRef.current()
    map.on('click', handler)
    return () => {
      map.off('click', handler)
    }
  }, [map])
  return null
}

/** Smoothly flies the map to the selected zone (selection changes only). */
function FlyToSelected({ zoneId, zones }: { zoneId?: string | null; zones: ZoneWithScore[] }) {
  const map = useMap()
  const prevRef = useRef<string | null>(null)
  useEffect(() => {
    if (!zoneId) {
      prevRef.current = null
      return
    }
    if (zoneId === prevRef.current) return
    const zone = zones.find((z) => z.location.id === zoneId)
    prevRef.current = zoneId
    if (zone) {
      map.flyTo([zone.location.lat, zone.location.lng], Math.max(map.getZoom(), 7.5), {
        duration: 1.2,
      })
    }
  }, [zoneId, zones, map])
  return null
}

/**
 * Hero risk map for the dashboard: satellite + live risk circles,
 * real historical landslide markers, evacuation routes, toggleable layers.
 */
export default function DashboardMap({
  zones,
  onSelectZone,
  onDeselectZone,
  selectedZoneId = null,
  evacRoutes = [],
  evacHospital = null,
  evacFrom = null,
  background = false,
}: DashboardMapProps) {
  const [layersOpen, setLayersOpen] = useState(false)
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({
    risk: true,
    history: true,
    labels: true,
    routes: true,
  })
  const toggle = (id: LayerId) => setLayers((l) => ({ ...l, [id]: !l[id] }))

  const layersRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!layersOpen) return
    const onDown = (e: MouseEvent) => {
      if (layersRef.current && !layersRef.current.contains(e.target as Node)) {
        setLayersOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [layersOpen])

  // Guard so a zone click (which also bubbles to the map) never deselects.
  // Leaflet fires the layer click before the map click, synchronously.
  const zoneClickAt = useRef(0)
  const markZoneClick = () => {
    zoneClickAt.current = Date.now()
  }
  const handleMapClick = () => {
    if (Date.now() - zoneClickAt.current < 400) return
    onDeselectZone?.()
  }

  const showRoutes = layers.routes && evacRoutes.length > 0

  return (
    <div
      className={
        background
          ? 'h-full w-full overflow-hidden'
          : 'relative overflow-hidden rounded-xl border border-[#1E2D47]'
      }
    >
      <MapContainer
        center={[26.8, 92.5]}
        zoom={6}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        dragging={!background}
        doubleClickZoom={!background}
        keyboard={!background}
        zoomAnimation
        fadeAnimation
        markerZoomAnimation
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={100}
        inertia
        className={background ? 'h-full w-full' : 'h-[320px] w-full md:h-[420px]'}
      >
        {!background ? <MapClickDeselect onClick={handleMapClick} /> : null}
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        {layers.labels ? (
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
        ) : null}
        {!background ? <FlyToSelected zoneId={selectedZoneId} zones={zones} /> : null}
        {layers.risk
          ? zones.map((zone) => {
              const color = zone.prediction ? riskColor(zone.prediction.level) : '#8CA0B8'
              return (
                <LayerGroup key={zone.location.id}>
                  <Circle
                    center={[zone.location.lat, zone.location.lng]}
                    radius={38000}
                    pathOptions={{ fillColor: color, fillOpacity: 0.1, stroke: false }}
                    eventHandlers={
                      background
                        ? undefined
                        : {
                            click: () => {
                              markZoneClick()
                              onSelectZone(zone)
                            },
                          }
                    }
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
                    eventHandlers={
                      background
                        ? undefined
                        : {
                            click: () => {
                              markZoneClick()
                              onSelectZone(zone)
                            },
                          }
                    }
                  />
                  <CircleMarker
                    center={[zone.location.lat, zone.location.lng]}
                    radius={9}
                    pathOptions={{ fillColor: color, fillOpacity: 0.9, color: '#0B1220', weight: 1 }}
                    eventHandlers={
                      background
                        ? undefined
                        : {
                            click: () => {
                              markZoneClick()
                              onSelectZone(zone)
                            },
                          }
                    }
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
                pathOptions={{ fillColor: '#FB923C', fillOpacity: 0.75, color: '#0B1220', weight: 0.5 }}
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

      {background ? null : (
        <div ref={layersRef} className="absolute right-3 bottom-3 z-[500]">
          <button
            type="button"
            onClick={() => setLayersOpen((o) => !o)}
            aria-label="Map layers"
            aria-expanded={layersOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1E2D47] bg-[#0B1220]/90 text-[#E8EEF7] backdrop-blur-sm transition-all duration-200 hover:bg-[#16233C] active:scale-95"
          >
            <Layers className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
          <div
            className={`absolute right-0 bottom-12 w-52 origin-bottom-right overflow-hidden rounded-xl border border-[#1E2D47] bg-[#0B1220]/95 backdrop-blur-sm transition-all duration-300 ease-out ${
              layersOpen
                ? 'scale-100 opacity-100'
                : 'pointer-events-none scale-95 opacity-0'
            }`}
          >
            <p className="border-b border-[#1E2D47] px-3.5 py-2.5 text-[13px] font-medium text-[#E8EEF7]">
              Map Layers
            </p>
            <div className="flex flex-col gap-1 px-3.5 py-2.5">
              {LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => toggle(layer.id)}
                  className="flex items-center justify-between py-1.5 text-left text-[13px] text-[#E8EEF7]"
                  role="switch"
                  aria-checked={layers[layer.id]}
                >
                  {layer.label}
                  <span
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                      layers[layer.id] ? 'bg-[#3B82F6]' : 'bg-[#1E2D47]'
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
            </div>
          </div>
        </div>
      )}

      {background ? null : (
        <div className="absolute bottom-3 left-3 z-[500] rounded-xl border border-[#1E2D47] bg-[#0B1220]/90 px-3.5 py-2.5 backdrop-blur-sm">
          <p className="mb-1.5 text-[11px] font-medium text-[#8CA0B8]">Landslide Risk Level</p>
          <div className="flex flex-col gap-1">
            {[
              ['Low', '#34D399'],
              ['Moderate', '#FBBF24'],
              ['High', '#FB923C'],
              ['Critical', '#F87171'],
            ].map(([label, color]) => (
              <span key={label} className="inline-flex items-center gap-2 text-[12px] text-[#E8EEF7]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
          {showRoutes ? (
            <div className="mt-2 flex flex-col gap-1 border-t border-[#1E2D47] pt-2">
              {evacRoutes.map((route, i) => (
                <span
                  key={route.label}
                  className="inline-flex items-center gap-2 text-[12px] text-[#E8EEF7]"
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
      )}
    </div>
  )
}
