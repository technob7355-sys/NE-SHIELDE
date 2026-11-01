/**
 * Incidents — minimal but REAL per-browser incident workflow (localStorage).
 *
 * HONESTY: incidents live ONLY in this browser. There is no server, no
 * cross-operator sync, no dispatch integration. Status changes are gated by
 * the demo role switcher (services/roles.ts). Real incident management is a
 * backend concern — see docs/backend-notifications-spec.md.
 */
import { canManageIncidents, canWorkIncidents, getRole } from './roles'

export type IncidentStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed'

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const INCIDENT_FLOW: Record<IncidentStatus, IncidentStatus[]> = {
  open: ['assigned', 'closed'],
  assigned: ['in_progress', 'open'],
  in_progress: ['resolved', 'assigned'],
  resolved: ['closed', 'in_progress'],
  closed: [],
}

export interface IncidentSource {
  kind: 'alert' | 'report'
  id: string
  label: string
}

export interface IncidentNote {
  at: string
  by: string
  text: string
}

export interface IncidentAuditEntry {
  at: string
  by: string
  action: string
  detail: string
}

export interface Incident {
  id: string
  title: string
  source: IncidentSource
  zoneId: string | null
  zoneName: string | null
  assignee: string
  status: IncidentStatus
  notes: IncidentNote[]
  audit: IncidentAuditEntry[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'ne_shield_incidents_v1'

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
    /* session-only */
  }
}

export function makeIncidentId(): string {
  const t = Date.now().toString(36).toUpperCase()
  const r = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `INC-${t}-${r}`
}

export function loadIncidents(): Incident[] {
  const parsed = readJSON<Incident[]>(STORAGE_KEY, [])
  if (!Array.isArray(parsed)) return []
  return parsed.map((i) => ({
    ...i,
    notes: Array.isArray(i.notes) ? i.notes : [],
    audit: Array.isArray(i.audit) ? i.audit : [],
  }))
}

function saveIncidents(incidents: Incident[]): void {
  writeJSON(STORAGE_KEY, incidents)
}

function audit(incident: Incident, by: string, action: string, detail: string): void {
  const now = new Date().toISOString()
  incident.audit = [...incident.audit, { at: now, by, action, detail }]
  incident.updatedAt = now
}

export function incidentExistsFor(sourceId: string): boolean {
  return loadIncidents().some((i) => i.source.id === sourceId)
}

export function createIncident(
  by: string,
  input: {
    title: string
    source: IncidentSource
    zoneId: string | null
    zoneName: string | null
    assignee: string
  },
): { ok: boolean; error?: string; incident?: Incident } {
  if (!canWorkIncidents(getRole())) {
    return { ok: false, error: 'Creating incidents needs the Field Officer or Operator demo role.' }
  }
  if (!input.title.trim()) return { ok: false, error: 'Title is required.' }
  const incident: Incident = {
    id: makeIncidentId(),
    title: input.title.trim().slice(0, 140),
    source: input.source,
    zoneId: input.zoneId,
    zoneName: input.zoneName,
    assignee: input.assignee.trim(),
    status: input.assignee.trim() ? 'assigned' : 'open',
    notes: [],
    audit: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  audit(
    incident,
    by,
    `Incident created from ${input.source.kind}`,
    input.source.label.slice(0, 160),
  )
  const all = loadIncidents()
  saveIncidents([incident, ...all])
  return { ok: true, incident }
}

export function assignIncident(
  id: string,
  by: string,
  assignee: string,
): { ok: boolean; error?: string } {
  if (!canManageIncidents(getRole())) {
    return { ok: false, error: 'Assigning incidents needs the Control-Room Operator demo role.' }
  }
  const all = loadIncidents()
  const incident = all.find((i) => i.id === id)
  if (!incident) return { ok: false, error: 'Incident not found in this browser.' }
  const prev = incident.assignee
  incident.assignee = assignee.trim()
  if (incident.status === 'open' && incident.assignee) incident.status = 'assigned'
  audit(incident, by, `Assignee: ${prev || '—'} → ${incident.assignee || '—'}`, '')
  saveIncidents(all)
  return { ok: true }
}

export function transitionIncident(
  id: string,
  next: IncidentStatus,
  by: string,
  note?: string,
): { ok: boolean; error?: string } {
  if (!canManageIncidents(getRole())) {
    return { ok: false, error: 'Changing incident status needs the Control-Room Operator demo role.' }
  }
  const all = loadIncidents()
  const incident = all.find((i) => i.id === id)
  if (!incident) return { ok: false, error: 'Incident not found in this browser.' }
  if (!INCIDENT_FLOW[incident.status].includes(next)) {
    return {
      ok: false,
      error: `Cannot move from "${INCIDENT_STATUS_LABELS[incident.status]}" to "${INCIDENT_STATUS_LABELS[next]}".`,
    }
  }
  const prev = incident.status
  incident.status = next
  audit(
    incident,
    by,
    `Status: ${INCIDENT_STATUS_LABELS[prev]} → ${INCIDENT_STATUS_LABELS[next]}`,
    note?.trim() ?? '',
  )
  saveIncidents(all)
  return { ok: true }
}

export function addIncidentNote(id: string, by: string, text: string): { ok: boolean; error?: string } {
  if (!canWorkIncidents(getRole())) {
    return { ok: false, error: 'Adding notes needs the Field Officer or Operator demo role.' }
  }
  if (!text.trim()) return { ok: false, error: 'Note text is required.' }
  const all = loadIncidents()
  const incident = all.find((i) => i.id === id)
  if (!incident) return { ok: false, error: 'Incident not found in this browser.' }
  const now = new Date().toISOString()
  incident.notes = [...incident.notes, { at: now, by, text: text.trim().slice(0, 400) }]
  audit(incident, by, 'Note added', text.trim().slice(0, 140))
  saveIncidents(all)
  return { ok: true }
}
