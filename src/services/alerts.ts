import type { ZoneWithScore } from '../components/types'
import { levelRank, worstLevel } from '../ml/model'

export interface Alert {
  id: string
  severity: 'Critical' | 'High' | 'Moderate'
  title: string
  detail: string
  zoneId: string
  zoneName: string
  time: string
}

const SEVERITY_ORDER: Record<Alert['severity'], number> = { Critical: 0, High: 1, Moderate: 2 }

/**
 * Real alerts derived from live zone data — no simulation.
 * - Zones currently at High/Critical risk.
 * - Zones whose 3-day outlook rises above the current level.
 */
export function buildAlerts(zones: ZoneWithScore[]): Alert[] {
  const alerts: Alert[] = []
  for (const zone of zones) {
    const level = zone.prediction?.level
    const t = zone.weather?.fetchedAt ?? new Date().toISOString()
    if (level === 'Critical' || level === 'High') {
      alerts.push({
        id: `now-${zone.location.id}`,
        severity: level,
        title: `${level} risk in ${zone.location.name}`,
        detail: `Score ${Math.round(zone.prediction?.score ?? 0)} • ${zone.weather?.rainfall.toFixed(0) ?? '—'} mm rain (24h)`,
        zoneId: zone.location.id,
        zoneName: zone.location.name,
        time: t,
      })
    }
    if (zone.outlook && zone.outlook.length > 0 && zone.prediction) {
      const worst = worstLevel(zone.outlook.map((d) => d.level))
      if (worst && levelRank(worst) > levelRank(zone.prediction.level)) {
        const worstDay = zone.outlook.reduce((a, b) => (levelRank(b.level) > levelRank(a.level) ? b : a))
        alerts.push({
          id: `rise-${zone.location.id}`,
          severity: worst === 'Critical' ? 'Critical' : worst === 'High' ? 'High' : 'Moderate',
          title: `Risk rising in ${zone.location.name}`,
          detail: `${worst} expected ${worstDay.date} • ${worstDay.rainfall.toFixed(0)} mm forecast`,
          zoneId: zone.location.id,
          zoneName: zone.location.name,
          time: t,
        })
      }
    }
  }
  return alerts
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, 10)
}
