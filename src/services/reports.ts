/**
 * Hazard reports — per-browser localStorage persistence.
 *
 * HONESTY:
 * - Reports never leave this device. There is no server, no cross-device
 *   sync, and no multi-operator review queue.
 * - A submitted report is NOT a verified landslide event and must never be
 *   treated as ground truth, no matter how close it is to a monitored zone.
 * - Status transitions are a FRONTEND DEMO gated by the demo role switcher
 *   (services/roles.ts). Real review is a control-room process with backend
 *   RBAC — see docs/auth-rbac-guide.md.
 */
import { LOCATIONS, type ZoneLocation } from '../data/locations'
import { getStatus as getLifecycleStatus, setStatus as setLifecycleStatus } from './alertStore'
import { canReviewReports, getRole } from './roles'

/* ------------------------------------------------------------------ */
/* Report status workflow (§10.4)                                      */
/* ------------------------------------------------------------------ */

export type ReportStatus =
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'assigned'
  | 'action_taken'
  | 'resolved'
  | 'rejected'
  | 'duplicate'
  | 'unable_to_verify'

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  submitted: 'Submitted — pending verification',
  under_review: 'Under Review',
  verified: 'Verified',
  assigned: 'Assigned',
  action_taken: 'Action Taken',
  resolved: 'Resolved',
  rejected: 'Rejected',
  duplicate: 'Duplicate',
  unable_to_verify: 'Unable to Verify',
}

/** Allowed forward transitions for hazard reports. */
export const REPORT_FLOW: Record<ReportStatus, ReportStatus[]> = {
  submitted: ['under_review', 'rejected', 'duplicate', 'unable_to_verify'],
  under_review: ['verified', 'rejected', 'duplicate', 'unable_to_verify'],
  verified: ['assigned'],
  assigned: ['action_taken'],
  action_taken: ['resolved', 'under_review'],
  resolved: [],
  rejected: [],
  duplicate: [],
  unable_to_verify: [],
}

/* ------------------------------------------------------------------ */
/* Report categories — what the citizen saw (never "confirmed")        */
/* ------------------------------------------------------------------ */

export const REPORT_CATEGORIES = [
  'Landslide',
  'Rockfall',
  'Ground cracks',
  'Road blockage',
  'Slope seepage / muddy water',
  'Tilted trees or poles',
  'Flood',
  'Other',
] as const

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface PhotoMeta {
  name: string
  sizeBytes: number
  mime: string
  /** Honest storage note: session-only preview, never uploaded. */
  note: string
}

export interface ReportAuditEntry {
  at: string
  by: string
  action: string
  detail: string
}

export interface HazardReport {
  id: string
  location: string
  /** Kept as `type` (not `category`) for backward compatibility with stored data. */
  type: string
  description: string
  photoName: string | null
  photoMeta: PhotoMeta | null
  lat: number | null
  lng: number | null
  /** Nearest monitored zone at submit time (correlation only — never verification). */
  nearestZoneId: string | null
  nearestZoneName: string | null
  nearestZoneKm: number | null
  status: ReportStatus
  history: ReportAuditEntry[]
  consentAt: string | null
  time: string
}

const STORAGE_KEY = 'neshield_reports_v4'
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024 // 5 MB — per-browser session preview

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable — caller keeps the in-memory list
  }
}

/** Unique report IDs: readable, prefixed, collision-safe for local use. */
export function makeReportId(): string {
  const t = Date.now().toString(36).toUpperCase()
  const r = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `RPT-${t}-${r}`
}

/**
 * Map the legacy alert-store lifecycle (used by the older review UI) onto the
 * report workflow. One-way migration for reports submitted before Nov 1, 2026.
 */
function migrateStatus(id: string): ReportStatus {
  switch (getLifecycleStatus(id)) {
    case 'new':
    case 'pending_verification':
      return 'submitted'
    case 'acknowledged':
    case 'under_investigation':
      return 'under_review'
    case 'action_required':
      return 'assigned'
    case 'resolved':
      return 'resolved'
    case 'rejected':
      return 'rejected'
    case 'duplicate':
      return 'duplicate'
    case 'invalid':
      return 'unable_to_verify'
  }
}

/** Mirror the report workflow back into the alert lifecycle store so the
 *  legacy review queue stays consistent. Never the reverse: the report
 *  workflow is the source of truth for reports. */
function mirrorToLifecycle(id: string, status: ReportStatus): void {
  const map: Record<ReportStatus, Parameters<typeof setLifecycleStatus>[1]> = {
    submitted: 'pending_verification',
    under_review: 'under_investigation',
    verified: 'acknowledged',
    assigned: 'action_required',
    action_taken: 'action_required',
    resolved: 'resolved',
    rejected: 'rejected',
    duplicate: 'duplicate',
    unable_to_verify: 'invalid',
  }
  setLifecycleStatus(id, map[status], `Report workflow: ${REPORT_STATUS_LABELS[status]}`)
}

export function loadReports(): HazardReport[] {
  const parsed = readJSON<HazardReport[]>(STORAGE_KEY, [])
  if (!Array.isArray(parsed)) return []
  let dirty = false
  const next = parsed.map((r) => {
    const report: HazardReport = {
      ...r,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      photoMeta: r.photoMeta ?? null,
      nearestZoneId: r.nearestZoneId ?? null,
      nearestZoneName: r.nearestZoneName ?? null,
      nearestZoneKm: r.nearestZoneKm ?? null,
      history: Array.isArray(r.history) ? r.history : [],
      consentAt: r.consentAt ?? null,
      status: r.status ?? migrateStatus(r.id),
    }
    if (!r.status) {
      report.history = [
        ...report.history,
        {
          at: new Date().toISOString(),
          by: 'System',
          action: 'Status migrated to report workflow',
          detail: REPORT_STATUS_LABELS[report.status],
        },
      ]
      dirty = true
    }
    return report
  })
  if (dirty) writeJSON(STORAGE_KEY, next)
  return next
}

export function saveReports(reports: HazardReport[]): void {
  writeJSON(STORAGE_KEY, reports)
}

export function getReportStatus(report: HazardReport): ReportStatus {
  return report.status ?? 'submitted'
}

/** Allowed next statuses for a report (workflow only — no role check). */
export function nextReportStatuses(status: ReportStatus): ReportStatus[] {
  return REPORT_FLOW[status]
}

/**
 * Move a report through the review workflow.
 * Returns { ok, error } — transitions are gated to the Control-Room Operator
 * demo role and must follow REPORT_FLOW.
 */
export function transitionReportStatus(
  id: string,
  next: ReportStatus,
  by: string,
  note?: string,
): { ok: boolean; error?: string } {
  if (!canReviewReports(getRole())) {
    return { ok: false, error: 'Report review needs the Control-Room Operator demo role.' }
  }
  const reports = loadReports()
  const report = reports.find((r) => r.id === id)
  if (!report) return { ok: false, error: 'Report not found in this browser.' }
  const current = getReportStatus(report)
  if (!REPORT_FLOW[current].includes(next)) {
    return {
      ok: false,
      error: `Cannot move from "${REPORT_STATUS_LABELS[current]}" to "${REPORT_STATUS_LABELS[next]}".`,
    }
  }
  const now = new Date().toISOString()
  report.status = next
  report.history = [
    ...report.history,
    {
      at: now,
      by,
      action: `Status: ${REPORT_STATUS_LABELS[current]} → ${REPORT_STATUS_LABELS[next]}`,
      detail: note?.trim() ?? '',
    },
  ]
  saveReports(reports)
  mirrorToLifecycle(id, next)
  return { ok: true }
}

/** Append a free-text note to a report's audit trail. */
export function addReportNote(id: string, by: string, text: string): boolean {
  if (!text.trim()) return false
  const reports = loadReports()
  const report = reports.find((r) => r.id === id)
  if (!report) return false
  report.history = [
    ...report.history,
    { at: new Date().toISOString(), by, action: 'Note added', detail: text.trim().slice(0, 280) },
  ]
  saveReports(reports)
  return true
}

/* ------------------------------------------------------------------ */
/* Nearest-zone correlation (§10.5) — informational only                */
/* ------------------------------------------------------------------ */

export interface NearestZone {
  zone: ZoneLocation
  distanceKm: number
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * Nearest monitored zone to a report's coordinates, with haversine distance.
 * Informational only — NEVER auto-verifies a report. Proximity is context,
 * not evidence.
 */
export function nearestZone(lat: number, lng: number): NearestZone {
  let best: ZoneLocation = LOCATIONS[0]
  let bestKm = Number.POSITIVE_INFINITY
  for (const zone of LOCATIONS) {
    const d = haversineKm(lat, lng, zone.lat, zone.lng)
    if (d < bestKm) {
      bestKm = d
      best = zone
    }
  }
  return { zone: best, distanceKm: bestKm }
}

/** Soft region check — a warning hint, never a validation error. */
export function isOutsideNEIndia(lat: number, lng: number): boolean {
  return lat < 20 || lat > 30 || lng < 88 || lng > 98
}

/* ------------------------------------------------------------------ */
/* Validation (§10)                                                    */
/* ------------------------------------------------------------------ */

export interface ReportInput {
  location: string
  category: string
  description: string
  lat: string
  lng: string
  consent: boolean
}

export function validateReport(input: ReportInput): {
  ok: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
} {
  const errors: Record<string, string> = {}
  const warnings: Record<string, string> = {}
  if (input.location.trim().length < 3) {
    errors.location = 'Location is required (min 3 characters) — where did you see this?'
  }
  if (!REPORT_CATEGORIES.includes(input.category as ReportCategory)) {
    errors.category = 'Please pick what you saw from the list.'
  }
  if (input.description.trim().length < 10) {
    errors.description = 'Description is required (min 10 characters) — what did you see, and when?'
  }
  const latEmpty = input.lat.trim() === ''
  const lngEmpty = input.lng.trim() === ''
  if (!latEmpty || !lngEmpty) {
    const lat = Number(input.lat)
    const lng = Number(input.lng)
    if (latEmpty || lngEmpty || Number.isNaN(lat) || Number.isNaN(lng)) {
      errors.coords = 'Latitude and longitude must both be numbers, or both left empty.'
    } else if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      errors.coords = 'Latitude must be −90…90 and longitude −180…180.'
    } else if (isOutsideNEIndia(lat, lng)) {
      warnings.coords =
        'These coordinates are outside Northeast India — check for a typo. The report is still accepted.'
    }
  }
  if (!input.consent) {
    errors.consent = 'Please confirm the privacy notice below before submitting.'
  }
  return { ok: Object.keys(errors).length === 0, errors, warnings }
}

/** Validate a photo BEFORE accepting it: real image types, ≤ 5 MB. */
export function validatePhoto(file: File): { ok: boolean; error?: string } {
  const isImage =
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)
  if (!isImage) return { ok: false, error: 'Only image files (JPG, PNG, WebP…) are accepted.' }
  if (file.size > MAX_PHOTO_BYTES) {
    return {
      ok: false,
      error: `Photo is ${(file.size / 1048576).toFixed(1)} MB — the limit is 5 MB (this browser only).`,
    }
  }
  return { ok: true }
}
