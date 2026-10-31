import type { ZoneWithScore } from '../components/types'
import { HISTORICAL_EVENTS, type HistoricalEvent } from '../data/historicalEvents'

/** Data older than this is marked STALE (never silently treated as fresh). */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000

export type QualityStatus = 'loading' | 'fresh' | 'stale' | 'unavailable'

export interface ZoneQuality {
  status: QualityStatus
  /** ISO timestamp of the last successful fetch, or null. */
  fetchedAt: string | null
  /** Age in minutes, or null when unknown. */
  ageMin: number | null
}

/**
 * Per-zone data quality. Rules:
 * - no weather yet and no error → loading
 * - weather present but older than STALE_AFTER_MS → stale
 * - weather present and recent → fresh
 * - weather missing (fetch failed) → unavailable
 * A zone is NEVER reported as Low risk when its data is missing — callers
 * must render the grey Unknown state for stale/unavailable zones.
 */
export function zoneQuality(zone: ZoneWithScore): ZoneQuality {
  const fetchedAt = zone.weather?.fetchedAt ?? null
  if (!fetchedAt) {
    return { status: zone.error ? 'unavailable' : 'loading', fetchedAt: null, ageMin: null }
  }
  const ageMs = Date.now() - new Date(fetchedAt).getTime()
  const ageMin = Math.max(0, Math.round(ageMs / 60000))
  if (Number.isNaN(ageMs) || ageMs < 0) {
    return { status: 'fresh', fetchedAt, ageMin: 0 }
  }
  return {
    status: ageMs > STALE_AFTER_MS ? 'stale' : 'fresh',
    fetchedAt,
    ageMin,
  }
}

export type FeedState = 'live' | 'stale' | 'unavailable' | 'loading'

/** Aggregate feed state across all zones for the top-bar indicator. */
export function feedState(zones: ZoneWithScore[]): FeedState {
  if (zones.length === 0) return 'loading'
  const qs = zones.map(zoneQuality)
  const fresh = qs.filter((q) => q.status === 'fresh').length
  const unavailable = qs.filter((q) => q.status === 'unavailable').length
  if (fresh === zones.length) return 'live'
  if (unavailable === zones.length) return 'unavailable'
  if (qs.some((q) => q.status === 'loading')) return 'loading'
  return 'stale'
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  return 2 * R * Math.asin(Math.sqrt(a))
}

export interface NearbyEvent extends HistoricalEvent {
  distanceKm: number
}

/** Nearest historical events to a point, sorted by distance. */
export function nearestEvents(
  lat: number,
  lng: number,
  n: number,
  maxKm = 60,
): NearbyEvent[] {
  return HISTORICAL_EVENTS.map((e) => ({
    ...e,
    distanceKm: haversineKm(lat, lng, e.lat, e.lng),
  }))
    .filter((e) => e.distanceKm <= maxKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, n)
}
