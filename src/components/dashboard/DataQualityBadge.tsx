import type { QualityStatus } from '../../services/dataQuality'

const STYLE: Record<QualityStatus, { bg: string; color: string; label: string }> = {
  fresh: { bg: 'rgba(52,211,153,0.12)', color: '#34D399', label: 'Fresh' },
  stale: { bg: 'rgba(251,191,36,0.12)', color: '#FBBF24', label: 'Stale' },
  unavailable: { bg: 'rgba(148,163,184,0.12)', color: '#64748B', label: 'Unavailable' },
  loading: { bg: 'rgba(148,163,184,0.12)', color: '#64748B', label: 'Loading' },
}

/** Data-quality badge: Fresh / Stale / Unavailable. Never implies Low risk. */
export default function DataQualityBadge({
  status,
  detail,
}: {
  status: QualityStatus
  detail?: string
}) {
  const s = STYLE[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.color }}
      title={detail ?? s.label}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
      {s.label}
    </span>
  )
}
