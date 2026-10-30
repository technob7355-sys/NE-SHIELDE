import type { ForecastDayRisk } from '../types'
import { riskColor } from '../risk'

interface OutlookChartProps {
  days: ForecastDayRisk[]
}

const W = 480
const H = 170
const PAD_L = 30
const PAD_B = 24
const PAD_T = 22

function dayLabel(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
      new Date(`${isoDate}T00:00:00Z`),
    )
  } catch {
    return isoDate
  }
}

/** Real 3-day risk outlook as colored bars (pure SVG, no library). */
export default function OutlookChart({ days }: OutlookChartProps) {
  const data = days.slice(0, 3)
  if (data.length === 0) return null
  const innerW = W - PAD_L - 8
  const innerH = H - PAD_T - PAD_B
  const slot = innerW / data.length
  const barW = Math.min(90, slot - 40)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Risk outlook next 3 days">
      <defs>
        {data.map((d, i) => (
          <linearGradient key={d.date} id={`ol-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={riskColor(d.level)} />
            <stop offset="100%" stopColor={riskColor(d.level)} stopOpacity="0.35" />
          </linearGradient>
        ))}
      </defs>
      <text x={2} y={PAD_T - 8} fill="#8CA0B8" fontSize="11">
        Score
      </text>
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={PAD_L}
          x2={W - 8}
          y1={PAD_T + innerH * f}
          y2={PAD_T + innerH * f}
          stroke="#1E2D47"
          strokeWidth="1"
        />
      ))}
      {data.map((d, i) => {
        const h = Math.max(6, (d.score / 100) * innerH)
        const x = PAD_L + i * slot + (slot - barW) / 2
        return (
          <g key={d.date}>
            <text
              x={x + barW / 2}
              y={PAD_T + innerH - h - 6}
              fill="#E8EEF7"
              fontSize="14"
              fontWeight="700"
              textAnchor="middle"
            >
              {Math.round(d.score)}
            </text>
            <rect
              x={x}
              y={PAD_T + innerH - h}
              width={barW}
              height={h}
              rx={6}
              fill={`url(#ol-${i})`}
            />
            <text
              x={x + barW / 2}
              y={H - 6}
              fill="#8CA0B8"
              fontSize="11"
              textAnchor="middle"
            >
              {dayLabel(d.date)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
