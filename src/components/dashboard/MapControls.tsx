import { useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { ZoneWithScore } from '../types'
import { riskColor } from '../risk'

export const RISK_FILTERS = ['All', 'Critical', 'High', 'Moderate', 'Low', 'Unknown'] as const
export type RiskFilter = (typeof RISK_FILTERS)[number]

/** Instant local search over the 20 monitoring zones (no network). */
export function ZoneSearch({
  zones,
  onPick,
}: {
  zones: ZoneWithScore[]
  onPick: (zone: ZoneWithScore) => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    return zones
      .filter(
        (z) =>
          z.location.name.toLowerCase().includes(needle) ||
          z.location.state.toLowerCase().includes(needle),
      )
      .slice(0, 8)
  }, [zones, q])

  return (
    <div ref={boxRef} className="absolute top-3 left-3 z-[500] w-[240px]">
      <div className="flex items-center gap-2 rounded-lg border border-[#1E2D47] bg-[#0B1220]/95 px-3 py-2 backdrop-blur-sm">
        <Search className="h-4 w-4 shrink-0 text-[#8CA0B8]" aria-hidden="true" />
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results.length > 0) {
              onPick(results[0])
              setQ('')
              setOpen(false)
            }
            if (e.key === 'Escape') {
              setQ('')
              setOpen(false)
            }
          }}
          placeholder="Search zones…"
          aria-label="Search monitoring zones"
          className="w-full bg-transparent text-[14px] text-[#E8EEF7] placeholder:text-[#8CA0B8] focus:outline-none"
        />
        {q ? (
          <button
            type="button"
            aria-label="Clear search"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setQ('')}
            className="text-[#8CA0B8] hover:text-[#E8EEF7]"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {open && results.length > 0 ? (
        <div className="mt-1 overflow-hidden rounded-lg border border-[#1E2D47] bg-[#0B1220]/95 backdrop-blur-sm">
          {results.map((z) => (
            <button
              key={z.location.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(z)
                setQ('')
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#E8EEF7] hover:bg-[#16233C]"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: z.prediction
                    ? riskColor(z.prediction.level)
                    : '#8CA0B8',
                }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-[14px]" title={z.location.name}>{z.location.name}</span>
              <span className="shrink-0 text-[13px] text-[#8CA0B8]">{z.location.state}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** Risk-level filter chips for the map. */
export function RiskFilterChips({
  value,
  onChange,
}: {
  value: RiskFilter
  onChange: (f: RiskFilter) => void
}) {
  return (
    <div
      className="absolute top-3 right-3 z-[500] flex max-w-[60%] flex-wrap justify-end gap-1.5"
      role="group"
      aria-label="Filter zones by risk level"
    >
      {RISK_FILTERS.map((f) => {
        const active = value === f
        return (
          <button
            key={f}
            type="button"
            onClick={() => onChange(f)}
            aria-pressed={active}
            className={`rounded-full border px-2.5 py-1 text-[13px] font-medium whitespace-nowrap backdrop-blur-sm transition-all ${
              active
                ? 'border-[#3B82F6] bg-[#3B82F6]/25 text-[#E8EEF7]'
                : 'border-[#1E2D47] bg-[#0B1220]/85 text-[#8CA0B8] hover:text-[#E8EEF7]'
            }`}
          >
            {f}
          </button>
        )
      })}
    </div>
  )
}

/** Does a zone pass the active risk filter? Unknown = no prediction. */
export function zonePassesFilter(zone: ZoneWithScore, filter: RiskFilter): boolean {
  if (filter === 'All') return true
  if (filter === 'Unknown') return !zone.prediction
  return zone.prediction?.level === filter
}
