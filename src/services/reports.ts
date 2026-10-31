/**
 * Hazard reports — per-browser localStorage persistence.
 * HONESTY: reports never leave this device. A submitted report is NOT a
 * verified landslide event and must never be treated as ground truth.
 */
export interface HazardReport {
  id: string
  location: string
  type: string
  description: string
  photoName: string | null
  lat: number | null
  lng: number | null
  time: string
}

const STORAGE_KEY = 'neshield_reports_v4'

export function loadReports(): HazardReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HazardReport[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((r) => ({ ...r, lat: r.lat ?? null, lng: r.lng ?? null }))
  } catch {
    return []
  }
}

export function saveReports(reports: HazardReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
  } catch {
    // storage unavailable — caller keeps the in-memory list
  }
}

export function validateReport(input: {
  location: string
  description: string
  lat: string
  lng: string
}): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  if (input.location.trim().length < 3) {
    errors.location = 'Location is required (min 3 characters).'
  }
  if (input.description.trim().length < 10) {
    errors.description = 'Description is required (min 10 characters) — what did you see, when?'
  }
  const latEmpty = input.lat.trim() === ''
  const lngEmpty = input.lng.trim() === ''
  if (!latEmpty || !lngEmpty) {
    const lat = Number(input.lat)
    const lng = Number(input.lng)
    if (latEmpty || lngEmpty || Number.isNaN(lat) || Number.isNaN(lng)) {
      errors.coords = 'Coordinates must both be numbers, or both left empty.'
    } else if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      errors.coords = 'Latitude must be −90…90 and longitude −180…180.'
    }
  }
  return { ok: Object.keys(errors).length === 0, errors }
}
