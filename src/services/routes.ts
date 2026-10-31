// NE-SHIELD — evacuation driving routes via OSRM (OpenStreetMap routing).
//
// Real data only: routes come from the live OSRM demo server with
// alternatives=3. If the request fails, the result is { ok: false } and the
// UI must show an honest "unavailable" state instead of guessing.

export interface EvacRoute {
  /** "Route A" / "Route B" / "Route C" — fastest first, as OSRM returns. */
  label: string
  distanceKm: number
  durationMin: number
  /** GeoJSON LineString, coordinates as [lng, lat] pairs. */
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}

export interface RouteSearchResult {
  ok: boolean
  routes: EvacRoute[]
}

const LABELS = ['Route A', 'Route B', 'Route C']

interface OsrmRoute {
  distance?: number
  duration?: number
  geometry?: { type?: string; coordinates?: [number, number][] }
}

/**
 * Fetch up to 3 alternate driving routes from the zone to the hospital.
 * Never throws — failure is reported as { ok: false }.
 */
export async function fetchEvacRoutes(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<RouteSearchResult> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${fromLng},${fromLat};${toLng},${toLat}` +
    `?alternatives=3&overview=full&geometries=geojson`
  try {
    const res = await fetch(url)
    if (!res.ok) return { ok: false, routes: [] }
    const data = (await res.json()) as { code?: string; routes?: OsrmRoute[] }
    if (data.code !== 'Ok' || !Array.isArray(data.routes)) return { ok: false, routes: [] }
    const routes: EvacRoute[] = []
    for (let i = 0; i < Math.min(3, data.routes.length); i++) {
      const r = data.routes[i]
      const coords = Array.isArray(r.geometry?.coordinates) ? r.geometry!.coordinates : []
      if (r.geometry?.type !== 'LineString' || coords.length < 2) continue
      if (typeof r.distance !== 'number' || typeof r.duration !== 'number') continue
      routes.push({
        label: LABELS[i] ?? `Route ${i + 1}`,
        distanceKm: Math.round((r.distance / 1000) * 10) / 10,
        durationMin: Math.round(r.duration / 60),
        geometry: { type: 'LineString', coordinates: coords },
      })
    }
    return { ok: true, routes }
  } catch {
    return { ok: false, routes: [] }
  }
}
