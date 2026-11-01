interface RainfallChartProps {
  /** 24 hourly rainfall values (mm), oldest → newest. */
  values: number[]
}

const W = 480
const H = 150
const PAD_L = 30
const PAD_B = 20
const PAD_T = 14

/**
 * Real last-24-hours rainfall as a bar chart (pure SVG, no library).
 * HONESTY: missing hours render as a visible gap marker — never padded with
 * invented zeroes, and no line is drawn across gaps (bars, not a line).
 */
export default function RainfallChart({ values }: RainfallChartProps) {
  const data = values.slice(-24)
  // Number of leading slots with no reading. Slot i holds data[i - missing].
  const missing = 24 - data.length
  const max = Math.max(1, ...data)
  const innerW = W - PAD_L - 8
  const innerH = H - PAD_T - PAD_B
  const slot = innerW / 24
  const barW = Math.max(2, slot - 4)

  const hourLabels = [0, 6, 12, 18].map((back) => {
    const d = new Date(Date.now() - back * 3600 * 1000)
    return { back, label: `${String(d.getHours()).padStart(2, '0')}:00` }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Rainfall last 24 hours">
      <defs>
        <linearGradient id="rain-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <text x={2} y={PAD_T - 2} fill="#64748B" fontSize="12">
        {max.toFixed(0)} mm
      </text>
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={PAD_L}
          x2={W - 8}
          y1={PAD_T + innerH * f}
          y2={PAD_T + innerH * f}
          stroke="#D9D9D9"
          strokeWidth="1"
        />
      ))}
      {Array.from({ length: 24 }, (_, i) => {
        const idx = i - missing
        const v = idx >= 0 ? data[idx] : null
        const x = PAD_L + i * slot + 2
        if (v == null) {
          // Gap: no reading for this hour — a faint baseline tick, not a zero bar.
          return (
            <rect
              key={i}
              x={x}
              y={PAD_T + innerH - 3}
              width={barW}
              height={3}
              rx={1.5}
              fill="#CBD5E1"
              opacity={0.7}
            >
              <title>No reading for this hour</title>
            </rect>
          )
        }
        const h = Math.max(2, (v / max) * innerH)
        return (
          <rect
            key={i}
            x={x}
            y={PAD_T + innerH - h}
            width={barW}
            height={h}
            rx={2}
            fill="url(#rain-bar)"
            opacity={v > 0 ? 1 : 0.25}
          >
            <title>{v.toFixed(1)} mm</title>
          </rect>
        )
      })}
      {hourLabels.map(({ back, label }) => {
        const i = 23 - back
        return (
          <text
            key={back}
            x={PAD_L + i * slot + slot / 2}
            y={H - 5}
            fill="#64748B"
            fontSize="12"
            textAnchor="middle"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}
