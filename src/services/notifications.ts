import type { ZoneWithScore } from '../components/types'
import { levelRank } from '../ml/model'
import { zoneQuality } from './dataQuality'

/**
 * Real-time notification engine (frontend, per-browser).
 *
 * DELIVERY MECHANISM (documented, honest): notifications are computed from
 * live zone data on the app's polling cycle (every POLL_INTERVAL_MS, paused
 * while the tab is hidden). There is NO push/WebSocket/SMS — nothing is
 * delivered to other devices or operators. See docs/backend-notifications-spec.md
 * for the server design that would be needed for true realtime fan-out.
 *
 * All triggers use REAL data only. Cooldown/dedup rules:
 * - No repeat Critical for the same zone within CRITICAL_COOLDOWN_MS,
 *   EXCEPT a High → Critical escalation always notifies (never suppressed).
 * - Re-notification is allowed after genuine reoccurrence (level dropped and
 *   rose again, or cooldown expired).
 */

// Documented defaults — thresholds are configurable here in one place.
export const NOTIF_CONFIG = {
  /** Recompute triggers on this cadence (paused while tab hidden). */
  POLL_INTERVAL_MS: 12 * 60 * 1000,
  /** Min gap between repeat Critical notifications for the same zone. */
  CRITICAL_COOLDOWN_MS: 6 * 60 * 60 * 1000,
  /** Score jump that counts as rapid escalation even below Critical. */
  ESCALATION_POINTS: 25,
  /** Consecutive failed polls before a data-failure notification fires. */
  DATA_FAIL_STREAK: 3,
  /** Min gap between repeat data-failure notifications per zone. */
  DATA_FAIL_COOLDOWN_MS: 12 * 60 * 60 * 1000,
}

export type NotificationSeverity = 'Critical' | 'High' | 'Moderate' | 'Info'
export type NotificationType =
  | 'threshold'
  | 'escalation'
  | 'data-failure'
  | 'hazard-report'
  | 'resolution'
  | 'info'

export interface ThresholdInputs {
  rainfall: number
  rainfall3d: number
  rainfall30d: number
  soilMoisture: number
  slope: number
}

export interface Notification {
  id: string
  /** Stable key used for cooldown/dedup (e.g. "crit-zone-3"). */
  dedupKey: string
  type: NotificationType
  severity: NotificationSeverity
  title: string
  body: string
  zoneId?: string
  zoneName?: string
  createdAt: string
  read: boolean
  prevLevel?: string
  prevScore?: number
  level?: string
  score?: number
  inputs?: ThresholdInputs
}

interface ZoneSnapshot {
  level: string | null
  score: number | null
  failStreak: number
  at: string
}

type SnapshotMap = Record<string, ZoneSnapshot>

const NOTIF_KEY = 'ne_shield_notifications_v1'
const SNAP_KEY = 'ne_shield_zone_state_v1'
const MAX_NOTIFS = 100

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return (JSON.parse(raw) as T) ?? fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable — session-only behaviour */
  }
}

export function loadNotifications(): Notification[] {
  const list = readJSON<Notification[]>(NOTIF_KEY, [])
  return Array.isArray(list) ? list : []
}

export function loadSnapshot(): SnapshotMap {
  return readJSON<SnapshotMap>(SNAP_KEY, {})
}

function persist(notifs: Notification[], snap: SnapshotMap): void {
  writeJSON(NOTIF_KEY, notifs.slice(0, MAX_NOTIFS))
  writeJSON(SNAP_KEY, snap)
}

function lastNotifAt(notifs: Notification[], dedupKey: string): number | null {
  const found = notifs.find((n) => n.dedupKey === dedupKey)
  return found ? new Date(found.createdAt).getTime() : null
}

let uidCounter = 0
function makeId(prefix: string): string {
  uidCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${uidCounter}`
}

function baseNotif(n: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
  return { ...n, id: makeId('n'), createdAt: new Date().toISOString(), read: false }
}

export interface TriggerResult {
  notifications: Notification[]
  snapshot: SnapshotMap
}

/**
 * Compute notifications from a fresh zone-data load.
 * Pure apart from Date.now(). First run only builds the snapshot (no spam).
 */
export function computeTriggers(
  zones: ZoneWithScore[],
  prevSnap: SnapshotMap,
  existing: Notification[],
): TriggerResult {
  const now = Date.now()
  const isFirstRun = Object.keys(prevSnap).length === 0
  const out: Notification[] = []
  const snap: SnapshotMap = { ...prevSnap }
  const cfg = NOTIF_CONFIG

  const freshZones = zones.filter((z) => zoneQuality(z).status === 'fresh' && z.prediction)

  for (const zone of zones) {
    const zid = zone.location.id
    const prev = prevSnap[zid]
    const quality = zoneQuality(zone)

    if (quality.status === 'fresh' && zone.prediction) {
      const level = zone.prediction.level
      const score = Math.round(zone.prediction.score)
      const prevLevel = prev?.level ?? null
      const prevScore = prev?.score ?? null

      if (!isFirstRun && prevLevel && levelRank(level) > levelRank(prevLevel)) {
        const inputs: ThresholdInputs = {
          rainfall: zone.weather?.rainfall ?? 0,
          rainfall3d: zone.weather?.rainfall3d ?? 0,
          rainfall30d: zone.weather?.rainfall30d ?? 0,
          soilMoisture: zone.weather?.soilMoisture ?? 0,
          slope: zone.location.slope,
        }
        if (level === 'Critical') {
          const lastAt = lastNotifAt(existing, `crit-${zid}`)
          const inCooldown = lastAt != null && now - lastAt < cfg.CRITICAL_COOLDOWN_MS
          const isEscalation = prevLevel === 'High'
          // NEVER suppress a High → Critical escalation.
          if (!inCooldown || isEscalation) {
            out.push(
              baseNotif({
                dedupKey: `crit-${zid}`,
                type: 'threshold',
                severity: 'Critical',
                title: `${zone.location.name} entered Critical risk`,
                body:
                  `Risk rose from ${prevLevel} (${prevScore}) to Critical (${score}). ` +
                  `24h rain ${inputs.rainfall.toFixed(1)} mm, soil ${inputs.soilMoisture.toFixed(0)}%, slope ${inputs.slope}°.`,
                zoneId: zid,
                zoneName: zone.location.name,
                prevLevel,
                prevScore: prevScore ?? undefined,
                level,
                score,
                inputs,
              }),
            )
          }
        } else if (level === 'High' && (prevLevel === 'Low' || prevLevel === 'Moderate')) {
          out.push(
            baseNotif({
              dedupKey: `high-${zid}`,
              type: 'threshold',
              severity: 'High',
              title: `${zone.location.name} entered High risk`,
              body: `Risk rose from ${prevLevel} (${prevScore}) to High (${score}). 24h rain ${inputs.rainfall.toFixed(1)} mm.`,
              zoneId: zid,
              zoneName: zone.location.name,
              prevLevel,
              prevScore: prevScore ?? undefined,
              level,
              score,
              inputs,
            }),
          )
        } else if (
          prevScore != null &&
          score - prevScore >= cfg.ESCALATION_POINTS &&
          level !== 'Critical' &&
          level !== 'High'
        ) {
          // Rapid escalation below the High/Critical bands.
          out.push(
            baseNotif({
              dedupKey: `esc-${zid}-${now}`,
              type: 'escalation',
              severity: level === 'Moderate' ? 'Moderate' : 'Info',
              title: `Rapid risk rise in ${zone.location.name}`,
              body: `Score jumped from ${prevScore} to ${score} (+${score - prevScore}) — now ${level}. 24h rain ${inputs.rainfall.toFixed(1)} mm.`,
              zoneId: zid,
              zoneName: zone.location.name,
              prevLevel,
              prevScore,
              level,
              score,
              inputs,
            }),
          )
        }
      }

      // Downgrade / resolution: previously Critical/High, now lower.
      if (
        !isFirstRun &&
        prevLevel &&
        (prevLevel === 'Critical' || prevLevel === 'High') &&
        levelRank(level) < levelRank(prevLevel)
      ) {
        out.push(
          baseNotif({
            dedupKey: `res-${zid}-${now}`,
            type: 'resolution',
            severity: 'Info',
            title: `${zone.location.name} downgraded to ${level}`,
            body: `Risk fell from ${prevLevel} (${prevScore}) to ${level} (${score}). Conditions easing.`,
            zoneId: zid,
            zoneName: zone.location.name,
            prevLevel,
            prevScore: prevScore ?? undefined,
            level,
            score,
          }),
        )
      }

      snap[zid] = { level, score, failStreak: 0, at: new Date(now).toISOString() }
    } else if (quality.status === 'unavailable') {
      const streak = (prev?.failStreak ?? 0) + 1
      snap[zid] = {
        level: prev?.level ?? null,
        score: prev?.score ?? null,
        failStreak: streak,
        at: new Date(now).toISOString(),
      }
      if (!isFirstRun && streak === cfg.DATA_FAIL_STREAK) {
        const lastAt = lastNotifAt(existing, `datafail-${zid}`)
        if (lastAt == null || now - lastAt > cfg.DATA_FAIL_COOLDOWN_MS) {
          out.push(
            baseNotif({
              dedupKey: `datafail-${zid}`,
              type: 'data-failure',
              severity: 'High',
              title: `Data source failing for ${zone.location.name}`,
              body: `Weather data unavailable for ${streak} consecutive checks. Risk for this zone cannot be assessed — treat with caution, do not assume safe.`,
              zoneId: zid,
              zoneName: zone.location.name,
            }),
          )
        }
      }
    } else {
      // loading/stale: keep previous snapshot entry untouched
      if (!snap[zid] && prev) snap[zid] = prev
    }
  }

  // Global outage: previously had fresh zones, now none.
  const prevFreshCount = Object.values(prevSnap).filter((s) => s.failStreak === 0 && s.level).length
  if (!isFirstRun && prevFreshCount > 0 && freshZones.length === 0) {
    const lastAt = lastNotifAt(existing, 'datafail-all')
    if (lastAt == null || now - lastAt > cfg.DATA_FAIL_COOLDOWN_MS) {
      out.push(
        baseNotif({
          dedupKey: 'datafail-all',
          type: 'data-failure',
          severity: 'High',
          title: 'All data sources unavailable',
          body: 'No monitoring zone has fresh data right now. Risk assessments are paused — treat all zones with caution.',
        }),
      )
    }
  }

  return { notifications: out, snapshot: snap }
}

/** New hazard report submitted → operator notification (dedupe by report id). */
export function hazardReportNotification(report: {
  id: string
  location: string
  type: string
}): Notification {
  return baseNotif({
    dedupKey: `report-${report.id}`,
    type: 'hazard-report',
    severity: 'Moderate',
    title: `New hazard report: ${report.type}`,
    body: `${report.location} — status: Pending Verification. Submitted reports are NOT verified landslide events.`,
  })
}

/** Merge new notifications (newest first) and persist everything. */
export function commitTriggers(
  fresh: Notification[],
  snapshot: SnapshotMap,
  existing: Notification[],
): Notification[] {
  const merged = [...fresh, ...existing].slice(0, MAX_NOTIFS)
  persist(merged, snapshot)
  return merged
}

export function markRead(id: string): Notification[] {
  const list = loadNotifications().map((n) => (n.id === id ? { ...n, read: true } : n))
  writeJSON(NOTIF_KEY, list)
  return list
}

export function markAllRead(): Notification[] {
  const list = loadNotifications().map((n) => ({ ...n, read: true }))
  writeJSON(NOTIF_KEY, list)
  return list
}

export function unreadCount(list: Notification[]): number {
  return list.filter((n) => !n.read).length
}
