import { useState } from 'react'
import {
  Circle,
  CircleMarker,
  LayerGroup,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
} from 'react-leaflet'
import type { ZoneWithScore } from '../types'
import { riskColor } from '../risk'
import { HISTORICAL_EVENTS } from '../../data/historicalEvents'
import type { EvacRoute } from '../../services/routes'
import type { Hospital } from '../../services/places'
import { ROUTE_COLORS } from './SafetyPanel'

interface DashboardMapProps {
  zones: ZoneWithScore[]
  onSelectZone: (zone: ZoneWithScore) => void
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
  evacRoutes = [],
  evacHospital = null,
  evacFrom = null,
}: DashboardMapProps) {
  const [open, setOpen] = useState(true)
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({
    risk: true,
    history: true,
    labels: true,
    routes: true,
  })
  const toggle = (id: LayerId) => setLayers((l) => ({ ...l, [id]: !l[id] }))

  const showRoutes = layers.routes && evacRoutes.length > 0

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#1E2D47]">
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
        {layers.risk
          ? zones.map((zone) => {
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
                    pathOptions={{
                      fillColor: color,
                      fillOpacity: 0.28,
                      color,
                      weight: 1.5,
                      opacity: 0.85,
                    }}
                    eventHandlers={{ click: () => onSelectZone(zone) }}
                  />
                  <CircleMarker
                    center={[zone.location.lat, zone.location.lng]}
                    radius={9}
                    pathOptions={{ fillColor: color, fillOpacity: 0.9, color: '#0B1220', weight: 1 }}
                    eventHandlers={{ click: () => onSelectZone(zone) }}
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

      <div className="absolute top-3 right-3 z-[500] w-52 overflow-hidden rounded-xl border border-[#1E2D47] bg-[#0B1220]/90 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-[13px] font-medium text-[#E8EEF7]"
          aria-expanded={open}
        >
          Map Layers
          <span className={`text-[#8CA0B8] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {open ? (
          <div className="flex flex-col gap-1 border-t border-[#1E2D47] px-3.5 py-2.5">
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
            <p className="pt-1 text-[11px] leading-relaxed text-[#8CA0B8]">
              {HISTORICAL_EVENTS.length} recorded landslides (NASA GLC, 2007–2018)
            </p>
          </div>
        ) : null}
      </div>

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
    </div>
  )
}
