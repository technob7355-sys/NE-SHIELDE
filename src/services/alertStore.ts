/**
 * Per-browser alert lifecycle store (localStorage).
 *
 * HONESTY: this persists ONLY in this browser. There is no server, no
 * multi-operator sync, no cross-device audit log. Every surface that reads
 * this store must label operator identity as "Control Room (this device)".
 */
export type LifecycleStatus =
  | 'new'
  | 'pending_verification'
  | 'acknowledged'
  | 'under_investigation'
  | 'action_required'
  | 'resolved'
  | 'rejected'
  | 'duplicate'
  | 'invalid'

export const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  new: 'New',
  pending_verification: 'Pending Verification',
  acknowledged: 'Acknowledged',
  under_investigation: 'Under Investigation',
  action_required: 'Action Required',
  resolved: 'Resolved',
  rejected: 'Rejected',
  duplicate: 'Duplicate',
  invalid: 'Invalid',
}

/** Allowed forward transitions. Reports may also end in rejected/duplicate/invalid. */
export const LIFECYCLE_FLOW: Record<LifecycleStatus, LifecycleStatus[]> = {
  new: ['pending_verification', 'acknowledged', 'rejected', 'duplicate', 'invalid'],
  pending_verification: ['acknowledged', 'under_investigation', 'rejected', 'duplicate', 'invalid'],
  acknowledged: ['under_investigation', 'action_required', 'resolved'],
  under_investigation: [
    'action_required',
    'acknowledged',
    'resolved',
    'rejected',
    'duplicate',
    'invalid',
  ],
  action_required: ['under_investigation', 'resolved', 'rejected', 'duplicate', 'invalid'],
  resolved: [],
  rejected: [],
  duplicate: [],
  invalid: [],
}

export interface LifecycleNote {
  at: string
  by: string
  text: string
}

export interface AlertRecord {
  id: string
  status: LifecycleStatus
  updatedAt: string
  notes: LifecycleNote[]
}

export interface ActionLogEntry {
  at: string
  by: string
  action: string
  targetId: string
  detail: string
}

const RECORDS_KEY = 'ne_shield_alert_lifecycle_v1'
const LOG_KEY = 'ne_shield_alert_log_v1'
const MAX_LOG = 200

export const OPERATOR_LABEL = 'Control Room (this device)'

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
    // storage unavailable — in-memory session behaviour continues
  }
}

export function getRecord(id: string): AlertRecord | null {
  const all = readJSON<Record<string, AlertRecord>>(RECORDS_KEY, {})
  return all[id] ?? null
}

export function getStatus(id: string): LifecycleStatus {
  return getRecord(id)?.status ?? 'new'
}

export function setStatus(id: string, status: LifecycleStatus, note?: string): AlertRecord {
  const all = readJSON<Record<string, AlertRecord>>(RECORDS_KEY, {})
  const prev = all[id]
  const now = new Date().toISOString()
  const record: AlertRecord = {
    id,
    status,
    updatedAt: now,
    notes: prev?.notes ?? [],
  }
  if (note && note.trim()) {
    record.notes = [...record.notes, { at: now, by: OPERATOR_LABEL, text: note.trim() }]
  }
  all[id] = record
  writeJSON(RECORDS_KEY, all)
  logAction({
    at: now,
    by: OPERATOR_LABEL,
    action: `status → ${LIFECYCLE_LABELS[status]}`,
    targetId: id,
    detail: note?.trim() ?? '',
  })
  return record
}

export function addNote(id: string, text: string): AlertRecord {
  const all = readJSON<Record<string, AlertRecord>>(RECORDS_KEY, {})
  const now = new Date().toISOString()
  const prev = all[id]
  const record: AlertRecord = {
    id,
    status: prev?.status ?? 'new',
    updatedAt: now,
    notes: [...(prev?.notes ?? []), { at: now, by: OPERATOR_LABEL, text: text.trim() }],
  }
  all[id] = record
  writeJSON(RECORDS_KEY, all)
  logAction({
    at: now,
    by: OPERATOR_LABEL,
    action: 'note added',
    targetId: id,
    detail: text.trim().slice(0, 140),
  })
  return record
}

export function logAction(entry: ActionLogEntry): void {
  const log = readJSON<ActionLogEntry[]>(LOG_KEY, [])
  log.unshift(entry)
  writeJSON(LOG_KEY, log.slice(0, MAX_LOG))
}

export function getLog(): ActionLogEntry[] {
  return readJSON<ActionLogEntry[]>(LOG_KEY, [])
}

export function getLogFor(targetId: string): ActionLogEntry[] {
  return getLog().filter((e) => e.targetId === targetId)
}

const TERMINAL_STATES: ReadonlySet<LifecycleStatus> = new Set([
  'resolved',
  'rejected',
  'duplicate',
  'invalid',
])

/**
 * Drop lifecycle records that reached a terminal state for ids that are no
 * longer active (neither a live alert nor a known hazard report). Without
 * this, a genuinely re-raised alert would inherit the old episode's
 * "Resolved"/"Rejected" status and look already handled. Non-terminal
 * records are kept on purpose: a brief data blip that drops and re-raises
 * an alert must not wipe in-progress operator work. Action history
 * (getLog) is never pruned here.
 */
export function pruneStaleRecords(activeIds: string[]): void {
  const active = new Set(activeIds)
  const all = readJSON<Record<string, AlertRecord>>(RECORDS_KEY, {})
  let changed = false
  for (const [id, rec] of Object.entries(all)) {
    if (!active.has(id) && TERMINAL_STATES.has(rec.status)) {
      delete all[id]
      changed = true
    }
  }
  if (changed) writeJSON(RECORDS_KEY, all)
}
