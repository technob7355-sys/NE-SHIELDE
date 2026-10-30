interface RainfallChartProps {
  /** 24 hourly rainfall values (mm), oldest → newest. */
  values: number[]
}

const W = 480
const H = 150
const PAD_L = 30
const PAD_B = 20
const PAD_T = 14

/** Real last-24-hours rainfall as a bar chart (pure SVG, no library). */
export default function RainfallChart({ values }: RainfallChartProps) {
  const data = values.slice(-24)
  while (data.length < 24) data.unshift(0)
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
      <text x={2} y={PAD_T - 2} fill="#8CA0B8" fontSize="11">
        {max.toFixed(0)} mm
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
      {data.map((v, i) => {
        const h = Math.max(2, (v / max) * innerH)
        return (
          <rect
            key={i}
            x={PAD_L + i * slot + 2}
            y={PAD_T + innerH - h}
            width={barW}
            height={h}
            rx={2}
            fill="url(#rain-bar)"
            opacity={v > 0 ? 1 : 0.25}
          />
        )
      })}
      {hourLabels.map(({ back, label }) => {
        const i = 23 - back
        return (
          <text
            key={back}
            x={PAD_L + i * slot + slot / 2}
            y={H - 5}
            fill="#8CA0B8"
            fontSize="10"
            textAnchor="middle"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}
