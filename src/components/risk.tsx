export const RISK_COLORS: Record<string, string> = {
  Low: '#34D399',
  Moderate: '#FBBF24',
  High: '#FB923C',
  Critical: '#F87171',
}

export function riskColor(level: string | null | undefined): string {
  if (!level) return '#8CA0B8'
  return RISK_COLORS[level] ?? '#8CA0B8'
}

export function formatTimeIST(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

export function formatTimeWithSecondsIST(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

export function formatDateTimeIST(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

export function LevelBadge({ level }: { level: string }) {
  const color = riskColor(level)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {level}
    </span>
  )
}

export function RiskDot({ level }: { level: string | null | undefined }) {
  const color = riskColor(level)
  return (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  )
}
