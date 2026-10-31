import { X } from 'lucide-react'
import type { ZoneWithScore } from './types'
import type { Alert } from '../services/alerts'
import { LevelBadge, formatTimeIST, riskColor } from './risk'
import { zoneQuality } from '../services/dataQuality'
import DataQualityBadge from './dashboard/DataQualityBadge'
import { guidanceFor } from './dashboard/Recommendations'

function formatDayLabel(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${isoDate}T00:00:00Z`))
  } catch {
    return isoDate
  }
}

interface ZoneDetailProps {
  zone: ZoneWithScore
  alerts: Alert[]
  onClose: () => void
}

/** Slide-in zone panel: operational facts only — no backend score internals. */
export default function ZoneDetail({ zone, alerts, onClose }: ZoneDetailProps) {
  const { location, weather, prediction } = zone
  const quality = zoneQuality(zone)
  const level = prediction?.level ?? null
  const guidance = guidanceFor(level, quality.status)

  const rows: { label: string; value: string }[] = [
    { label: 'Rain 24h', value: weather ? `${weather.rainfall.toFixed(1)} mm` : '—' },
    { label: 'Rain 3-day', value: weather ? `${weather.rainfall3d.toFixed(1)} mm` : '—' },
    { label: 'Rain 30-day', value: weather ? `${weather.rainfall30d.toFixed(1)} mm` : '—' },
    { label: 'Soil', value: weather ? `${weather.soilMoisture.toFixed(1)} %` : '—' },
    { label: 'Slope', value: `${location.slope} °` },
  ]

  return (
    <div className="flex h-full flex-col bg-[#101A2E]">
        <div className="flex items-start justify-between gap-3 border-b border-[#1E2D47] p-5">
          <div className="min-w-0">
            <p className="text-[22px] leading-snug font-bold text-[#E8EEF7]">{location.name}</p>
            <p className="mt-0.5 text-[14px] text-[#8CA0B8]">{location.state}</p>
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

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[28px] leading-none font-bold text-[#E8EEF7]">
              {prediction ? Math.round(prediction.score) : '—'}
            </span>
            {level ? <LevelBadge level={level} /> : null}
            {!prediction ? (
              <span className="rounded-full border border-[#1E2D47] bg-[#16233C] px-2 py-0.5 text-[14px] font-medium text-[#8CA0B8]">
                Unknown — data unavailable
              </span>
            ) : null}
            <DataQualityBadge
              status={quality.status}
              detail={
                quality.fetchedAt
                  ? `Last successful fetch ${formatTimeIST(quality.fetchedAt)} IST (${quality.ageMin} min ago)`
                  : undefined
              }
            />
          </div>

          {alerts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {alerts.map((a) => (
                <span
                  key={a.id}
                  className="rounded-full px-2 py-0.5 text-[12px] font-bold"
                  style={{
                    backgroundColor: `${riskColor(a.severity)}22`,
                    color: riskColor(a.severity),
                  }}
                >
                  {a.severity} alert active
                </span>
              ))}
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-[15px] font-medium text-[#8CA0B8]">Inputs</p>
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
            <p className="mt-2 text-[14px] leading-relaxed text-[#8CA0B8]">
              Weather: Open-Meteo (fetched {weather ? formatTimeIST(weather.fetchedAt) : '—'}) • Slope:
              terrain attribute
            </p>
          </div>

          {!prediction ? (
            <p className="text-[14px] leading-relaxed text-[#8CA0B8]">
              Live weather data is unavailable for this zone right now, so no risk level has been
              assigned. Unknown is shown as unknown — never as Low.
            </p>
          ) : null}

          <div className="rounded-xl border border-[#1E2D47] bg-[#16233C] p-4">
            <p className="mb-1 text-[13px] font-bold tracking-wider text-[#8CA0B8] uppercase">
              Operational guidance
            </p>
            <p className="text-[16px] font-medium text-[#E8EEF7]">{guidance.title}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-[#8CA0B8]">{guidance.text}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#8CA0B8]">
              Operational guidance — not an official government warning.
            </p>
          </div>

          {zone.outlook && zone.outlook.length > 0 ? (
            <div>
              <p className="mb-3 text-[15px] font-medium text-[#8CA0B8]">Next 3 days — forecast</p>
              <div className="grid grid-cols-3 gap-3">
                {zone.outlook.map((d) => (
                  <div key={d.date} className="rounded-xl border border-[#1E2D47] bg-[#16233C] p-3">
                    <p className="text-[13px] font-medium whitespace-nowrap text-[#8CA0B8]">
                      {formatDayLabel(d.date)}
                    </p>
                    <p className="mt-1 text-[18px] leading-none font-bold text-[#E8EEF7]">
                      {Math.round(d.score)}
                    </p>
                    <div className="mt-1.5">
                      <LevelBadge level={d.level} />
                    </div>
                    <p className="mt-1.5 text-[14px] whitespace-nowrap text-[#8CA0B8]">
                      {d.rainfall.toFixed(0)} mm rain
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-[#8CA0B8]">
                Forecast: Open-Meteo • same V4 formula, rolled forward day by day
              </p>
            </div>
          ) : null}

          <p className="text-[14px] text-[#8CA0B8]">
            Emergency: 112 • Ambulance: 108 • Disaster: 1077
          </p>
        </div>
    </div>
  )
}
