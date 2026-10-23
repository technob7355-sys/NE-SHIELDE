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
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close zone detail"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-[#0B1220] opacity-70"
      />
      <aside className="relative flex h-full w-[380px] max-w-[92vw] flex-col overflow-y-auto border-l border-[#1E2D47] bg-[#101A2E]">
        <div className="flex items-start justify-between gap-3 border-b border-[#1E2D47] p-5">
          <div className="min-w-0">
            <p className="truncate text-[20px] font-bold text-[#E8EEF7]">{location.name}</p>
            <p className="mt-0.5 truncate text-[13px] text-[#8CA0B8]">{location.state}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg border border-[#1E2D47] bg-[#16233C] p-2 text-[#E8EEF7]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-5 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[28px] leading-none font-bold text-[#E8EEF7]">
              {prediction ? Math.round(prediction.score) : '—'}
            </span>
            {level ? <LevelBadge level={level} /> : null}
            {!prediction ? (
              <span className="rounded-full border border-[#1E2D47] bg-[#16233C] px-2 py-0.5 text-[12px] font-medium text-[#8CA0B8]">
                Data unavailable
              </span>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-[#8CA0B8]">Inputs</p>
            <div className="overflow-hidden rounded-xl border border-[#1E2D47]">
              <table className="w-full text-[14px]">
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-b border-[#1E2D47] last:border-b-0">
                      <td className="px-4 py-2.5 text-[#8CA0B8]">{row.label}</td>
                      <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap text-[#E8EEF7]">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-[#8CA0B8]">
              Weather: Open-Meteo (fetched {weather ? formatTimeIST(weather.fetchedAt) : '—'}) • Slope:
              terrain attribute
            </p>
          </div>

          {prediction ? (
            <div>
              <p className="mb-3 text-[13px] font-medium text-[#8CA0B8]">Score breakdown</p>
              <div className="flex flex-col gap-3">
                {prediction.breakdown.map((item) => {
                  const pct =
                    item.max > 0 ? Math.min(100, Math.max(0, (item.points / item.max) * 100)) : 0
                  return (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="truncate text-[13px] text-[#E8EEF7]">{item.label}</span>
                        <span className="text-[13px] font-medium whitespace-nowrap text-[#8CA0B8]">
                          {item.points.toFixed(1)} / {item.max}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#16233C]">
                        <div
                          className="h-full rounded-full bg-[#3B82F6]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-[14px] leading-relaxed text-[#8CA0B8]">
              Live weather data is unavailable for this zone right now, so no score has been calculated.
              No number has been invented.
            </p>
          )}

          {advice ? (
            <div className="rounded-xl border border-[#1E2D47] bg-[#16233C] p-4">
              <p className="mb-1 text-[13px] font-medium text-[#8CA0B8]">What to do</p>
              <p className="text-[14px] leading-relaxed text-[#E8EEF7]">{advice}</p>
            </div>
          ) : null}

          <p className="text-[13px] text-[#8CA0B8]">
            Emergency: 112 • Ambulance: 108 • Disaster: 1077
          </p>
        </div>
      </aside>
    </div>
  )
}
