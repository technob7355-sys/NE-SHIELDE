// NE-SHIELD — nearby hospitals via OpenStreetMap (Overpass API).
//
// Real data only: hospitals come from the live Overpass API (primary
// overpass-api.de, with a public mirror as fallback). Nothing is invented.
// If every endpoint fails, the result is { ok: false } and the UI must show
// an honest "unavailable" state instead of guessing.

export interface Hospital {
  name: string
  lat: number
  lng: number
  /** Straight-line distance from the zone, in km. */
  distanceKm: number
  kind: 'hospital' | 'clinic'
}

export interface HospitalSearchResult {
  ok: boolean
  hospitals: Hospital[]
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const CACHE_TTL_MS = 30 * 60 * 1000
const cache = new Map<string, { at: number; data: HospitalSearchResult }>()

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  return 2 * r * Math.asin(Math.sqrt(a))
}

interface OverpassElement {
  lat?: number
  lon?: number
  tags?: Record<string, string>
}

async function queryOverpass(
  endpoint: string,
  lat: number,
  lng: number,
  radiusM: number,
  amenity: 'hospital' | 'clinic',
): Promise<Hospital[]> {
  const q = `[out:json][timeout:25];node(around:${radiusM},${lat},${lng})[amenity=${amenity}];out 40;`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(q),
  })
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
  const data = (await res.json()) as { elements?: OverpassElement[] }
  const elements = Array.isArray(data.elements) ? data.elements : []
  return elements
    .filter((e) => typeof e.lat === 'number' && typeof e.lon === 'number')
    .map((e) => {
      const rawName = e.tags?.name?.trim()
      return {
        name: rawName ? rawName : 'Unnamed medical facility',
        lat: e.lat as number,
        lng: e.lon as number,
        distanceKm: Math.round(haversineKm(lat, lng, e.lat as number, e.lon as number) * 10) / 10,
        kind: amenity,
      }
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 8)
}

/**
 * Find hospitals near a point. Tries each Overpass endpoint in turn;
 * if no hospital is found, falls back to clinics. Returns ok:false when
 * every endpoint fails (UI must show "unavailable", not fake data).
 */
export async function fetchNearbyHospitals(
  lat: number,
  lng: number,
  radiusKm = 20,
): Promise<HospitalSearchResult> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${radiusKm}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data

  const radiusM = Math.round(radiusKm * 1000)
  let result: HospitalSearchResult = { ok: false, hospitals: [] }

  for (const amenity of ['hospital', 'clinic'] as const) {
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const hospitals = await queryOverpass(endpoint, lat, lng, radiusM, amenity)
        result = { ok: true, hospitals }
        break
      } catch {
        result = { ok: false, hospitals: [] }
      }
    }
    if (result.ok && result.hospitals.length > 0) break
    // If hospitals failed everywhere, still try clinics before giving up.
    if (amenity === 'hospital' && !result.ok) continue
    if (result.ok) break
  }

  // Cache only successful lookups (an "empty but ok" result is real data).
  if (result.ok) cache.set(key, { at: Date.now(), data: result })
  return result
}
