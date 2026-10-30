import { Activity, AlertTriangle, Brain, CloudRain } from 'lucide-react'
import type { ZoneWithScore } from '../types'
import { LevelBadge, formatTimeIST } from '../risk'
import { levelRank, worstLevel } from '../../ml/model'

interface StatCardsProps {
  zones: ZoneWithScore[]
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
  sub: string
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
          <p className="mt-1.5 truncate text-[12px] text-[#8CA0B8]">{sub}</p>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  )
}

/** Four headline stat cards — all values from live zone data. */
export default function StatCards({ zones }: StatCardsProps) {
  const scored = zones.filter((z) => z.prediction)
  const highRisk = scored.filter(
    (z) => z.prediction!.level === 'Critical' || z.prediction!.level === 'High',
  )
  const rising = scored.filter((z) => {
    if (!z.outlook || z.outlook.length === 0 || !z.prediction) return false
    const worst = worstLevel(z.outlook.map((d) => d.level))
    return worst != null && levelRank(worst) > levelRank(z.prediction.level)
  }).length

  const maxRainZone = scored.reduce<ZoneWithScore | null>(
    (best, z) => (!best || (z.weather?.rainfall ?? 0) > (best.weather?.rainfall ?? 0) ? z : best),
    null,
  )
  const maxRain = maxRainZone?.weather?.rainfall ?? 0

  const online = zones.filter((z) => z.weather).length

  const worst = [...scored].sort(
    (a, b) => (b.prediction?.score ?? 0) - (a.prediction?.score ?? 0),
  )[0]
  const lastTime = zones
    .map((z) => z.weather?.fetchedAt)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1)

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        icon={AlertTriangle}
        iconBg="rgba(248,113,113,0.12)"
        iconColor="#F87171"
        title="High-Risk Zones"
        value={String(highRisk.length)}
        sub={rising > 0 ? `↑ ${rising} rising in 3-day outlook` : 'No rising trend in outlook'}
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
        title="Zones Online"
        value={`${online} / 20`}
        sub="Live Open-Meteo feed"
      />
      <Card
        icon={Brain}
        iconBg="rgba(251,191,36,0.12)"
        iconColor="#FBBF24"
        title="Highest Zone Risk"
        value={worst ? worst.prediction!.level : '—'}
        sub={lastTime ? `Last prediction: ${formatTimeIST(lastTime)}` : 'Waiting for live data'}
        right={worst ? <LevelBadge level={worst.prediction!.level} /> : undefined}
      />
    </div>
  )
}
