import { Activity, AlertTriangle, BellRing, CloudRain, RefreshCw } from 'lucide-react'
import type { ZoneWithScore } from '../types'
import type { Alert } from '../../services/alerts'
import { LevelBadge, formatTimeIST } from '../risk'
import { levelRank, worstLevel } from '../../ml/model'
import { zoneQuality } from '../../services/dataQuality'
import DataQualityBadge from './DataQualityBadge'

interface StatCardsProps {
  zones: ZoneWithScore[]
  alerts: Alert[]
}

function Card({
  icon,
  iconBg,
  iconColor,
  title,
  value,
  sub,
  right,
}: {
  icon: typeof Activity
  iconBg: string
  iconColor: string
  title: string
  value: string
  sub: React.ReactNode
  right?: React.ReactNode
}) {
  const Icon = icon
  return (
    <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: iconBg }}
          >
            <Icon className="h-5 w-5" style={{ color: iconColor }} aria-hidden="true" />
          </span>
          <p className="truncate text-[13px] text-[#8CA0B8]">{title}</p>
          <p className="mt-1 truncate text-[26px] leading-none font-bold text-[#E8EEF7]">{value}</p>
          <div className="mt-1.5 truncate text-[12px] text-[#8CA0B8]">{sub}</div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  )
}

/** Operational KPI cards — every value computed from live zone data. */
export default function StatCards({ zones, alerts }: StatCardsProps) {
  const scored = zones.filter((z) => z.prediction)
  const highRisk = scored.filter(
    (z) => z.prediction!.level === 'Critical' || z.prediction!.level === 'High',
  )
  const rising = scored.filter((z) => {
    if (!z.outlook || z.outlook.length === 0 || !z.prediction) return false
    const worst = worstLevel(z.outlook.map((d) => d.level))
    return worst != null && levelRank(worst) > levelRank(z.prediction.level)
  }).length

  const criticalAlerts = alerts.filter((a) => a.severity === 'Critical')

  const maxRainZone = scored.reduce<ZoneWithScore | null>(
    (best, z) => (!best || (z.weather?.rainfall ?? 0) > (best.weather?.rainfall ?? 0) ? z : best),
    null,
  )
  const maxRain = maxRainZone?.weather?.rainfall ?? 0

  const qualities = zones.map(zoneQuality)
  const fresh = qualities.filter((q) => q.status === 'fresh').length
  const stale = qualities.filter((q) => q.status === 'stale').length
  const unavailable = qualities.filter((q) => q.status === 'unavailable').length

  const worst = [...scored].sort(
    (a, b) => (b.prediction?.score ?? 0) - (a.prediction?.score ?? 0),
  )[0]
  const lastTime = zones
    .map((z) => z.weather?.fetchedAt)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1)
  const lastAgeMin = lastTime
    ? Math.max(0, Math.round((Date.now() - new Date(lastTime).getTime()) / 60000))
    : null
  const lastStatus =
    lastTime == null ? 'loading' : lastAgeMin! > 360 ? 'stale' : ('fresh' as const)

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Card
        icon={AlertTriangle}
        iconBg="rgba(248,113,113,0.12)"
        iconColor="#F87171"
        title="Active High-Risk Zones"
        value={String(highRisk.length)}
        sub={rising > 0 ? `↑ ${rising} rising in 3-day outlook` : 'No rising trend in outlook'}
        right={worst ? <LevelBadge level={worst.prediction!.level} /> : undefined}
      />
      <Card
        icon={BellRing}
        iconBg="rgba(251,146,60,0.12)"
        iconColor="#FB923C"
        title="Critical Alerts"
        value={String(criticalAlerts.length)}
        sub={`${alerts.length} total active alerts`}
      />
      <Card
        icon={CloudRain}
        iconBg="rgba(96,165,250,0.12)"
        iconColor="#60A5FA"
        title="Max 24h Rainfall"
        value={`${maxRain.toFixed(0)} mm`}
        sub={maxRainZone ? `at ${maxRainZone.location.name}` : 'Waiting for live data'}
      />
      <Card
        icon={Activity}
        iconBg="rgba(52,211,153,0.12)"
        iconColor="#34D399"
        title="Monitoring Coverage"
        value={`${fresh} / ${zones.length}`}
        sub={
          <>
            zones with fresh data
            {stale + unavailable > 0 ? (
              <span className="text-[#FBBF24]">
                {' '}
                • {stale} stale, {unavailable} unavailable
              </span>
            ) : null}
          </>
        }
      />
      <Card
        icon={RefreshCw}
        iconBg="rgba(96,165,250,0.12)"
        iconColor="#60A5FA"
        title="Data Freshness"
        value={lastTime ? formatTimeIST(lastTime) : '—'}
        sub={
          <span className="inline-flex items-center gap-1.5">
            last successful refresh{' '}
            <DataQualityBadge status={lastStatus} detail={lastTime ?? undefined} />
          </span>
        }
      />
    </div>
  )
}
