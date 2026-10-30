import { Circle, CircleMarker, LayerGroup, MapContainer, TileLayer } from 'react-leaflet'
import type { ZoneWithScore } from './types'
import { riskColor } from './risk'

interface MiniMapProps {
  zones: ZoneWithScore[]
  onSelectZone: (zone: ZoneWithScore) => void
}

/**
 * Compact glanceable risk map for the Overview dashboard.
 * Same Esri satellite tiles + risk circles as the full Live Map,
 * but static (no scroll/drag trapping) — zones stay clickable.
 */
export default function MiniMap({ zones, onSelectZone }: MiniMapProps) {
  return (
    <MapContainer
      center={[26.8, 92.5]}
      zoom={6}
      scrollWheelZoom={false}
      dragging={false}
      zoomControl={false}
      doubleClickZoom={false}
      boxZoom={false}
      keyboard={false}
      attributionControl={false}
      className="h-[300px] w-full md:h-[340px]"
    >
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
      {zones.map((zone) => {
        const color = zone.prediction ? riskColor(zone.prediction.level) : '#8CA0B8'
        return (
          <LayerGroup key={zone.location.id}>
            <Circle
              center={[zone.location.lat, zone.location.lng]}
              radius={25000}
              pathOptions={{ fillColor: color, fillOpacity: 0.28, color, weight: 1.5, opacity: 0.85 }}
              eventHandlers={{ click: () => onSelectZone(zone) }}
            />
            <CircleMarker
              center={[zone.location.lat, zone.location.lng]}
              radius={8}
              pathOptions={{ fillColor: color, fillOpacity: 0.9, color: '#0B1220', weight: 1 }}
              eventHandlers={{ click: () => onSelectZone(zone) }}
            />
          </LayerGroup>
        )
      })}
    </MapContainer>
  )
}
