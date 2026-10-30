import { X } from 'lucide-react'
import type { ZoneWithScore } from './types'
import { LevelBadge, formatTimeIST } from './risk'

const WHAT_TO_DO: Record<string, string> = {
  Low: 'Abhi khatra kam hai. Aam din ki tarah travel kar sakte hain, mausam par nazar rakhein.',
  Moderate: 'Dhyaan dein. Baarish badhe to is raste par savdhaani bartein.',
  High: 'Khatra zyada hai. Zaroori ho tabhi travel karein, local administration ki salah maanein.',
  Critical: 'Bahut khatra hai. Is ilaake me travel na karein. Surakshit jagah par rahein.',
}

interface ZoneDetailProps {
  zone: ZoneWithScore
  onClose: () => void
}

export default function ZoneDetail({ zone, onClose }: ZoneDetailProps) {
  const { location, weather, prediction } = zone
  const level = prediction?.level ?? null
  const advice = level ? (WHAT_TO_DO[level] ?? null) : null

  const rows: { label: string; value: string }[] = [
    { label: 'Rain 24h', value: weather ? `${weather.rainfall.toFixed(1)} mm` : '—' },
    { label: 'Rain 3-day', value: weather ? `${weather.rainfall3d.toFixed(1)} mm` : '—' },
    { label: 'Rain 30-day', value: weather ? `${weather.rainfall30d.toFixed(1)} mm` : '—' },
    { label: 'Soil', value: weather ? `${weather.soilMoisture.toFixed(1)} %` : '—' },
    { label: 'Slope', value: `${location.slope} °` },
  ]

  return (
    <div className="flex h-full flex-col bg-(--surface)">
        <div className="flex items-start justify-between gap-3 border-b border-(--border) p-5">
          <div className="min-w-0">
            <p className="truncate text-[20px] font-bold text-(--text)">{location.name}</p>
            <p className="mt-0.5 truncate text-[13px] text-(--muted)">{location.state}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg border border-(--border) bg-(--surface-2) p-2 text-(--text)"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[28px] leading-none font-bold text-(--text)">
              {prediction ? Math.round(prediction.score) : '—'}
            </span>
            {level ? <LevelBadge level={level} /> : null}
            {!prediction ? (
              <span className="rounded-full border border-(--border) bg-(--surface-2) px-2 py-0.5 text-[12px] font-medium text-(--muted)">
                Data unavailable
              </span>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-(--muted)">Inputs</p>
            <div className="overflow-hidden rounded-xl border border-(--border)">
              <table className="w-full text-[14px]">
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-b border-(--border) last:border-b-0">
                      <td className="px-4 py-2.5 text-(--muted)">{row.label}</td>
                      <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap text-(--text)">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-(--muted)">
              Weather: Open-Meteo (fetched {weather ? formatTimeIST(weather.fetchedAt) : '—'}) • Slope:
              terrain attribute
            </p>
          </div>

          {prediction ? (
            <div>
              <p className="mb-3 text-[13px] font-medium text-(--muted)">Score breakdown</p>
              <div className="flex flex-col gap-3">
                {prediction.breakdown.map((item) => {
                  const pct =
                    item.max > 0 ? Math.min(100, Math.max(0, (item.points / item.max) * 100)) : 0
                  return (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="truncate text-[13px] text-(--text)">{item.label}</span>
                        <span className="text-[13px] font-medium whitespace-nowrap text-(--muted)">
                          {item.points.toFixed(1)} / {item.max}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-(--surface-2)">
                        <div
                          className="bar-grow h-full rounded-full bg-(--accent)"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-[14px] leading-relaxed text-(--muted)">
              Live weather data is unavailable for this zone right now, so no score has been calculated.
              No number has been invented.
            </p>
          )}

          {advice ? (
            <div className="rounded-xl border border-(--border) bg-(--surface-2) p-4">
              <p className="mb-1 text-[13px] font-medium text-(--muted)">What to do</p>
              <p className="text-[14px] leading-relaxed text-(--text)">{advice}</p>
            </div>
          ) : null}

          <p className="text-[13px] text-(--muted)">
            Emergency: 112 • Ambulance: 108 • Disaster: 1077
          </p>
        </div>
    </div>
  )
}
