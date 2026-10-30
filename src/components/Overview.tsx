import type { ZoneWithScore } from './types'
import { LevelBadge, RiskDot, formatTimeIST } from './risk'

interface OverviewProps {
  zones: ZoneWithScore[]
  loading: boolean
  onSelectZone: (zone: ZoneWithScore) => void
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
      <p className="text-[28px] leading-none font-bold text-(--text)">{value}</p>
      <p className="mt-2 text-[12px] font-medium tracking-wide text-(--muted) uppercase">{label}</p>
    </div>
  )
}

export default function Overview({ zones, loading, onSelectZone }: OverviewProps) {
  const scored = zones.filter((z) => z.prediction !== null)
  const criticalHighCount = scored.filter(
    (z) => z.prediction && (z.prediction.level === 'Critical' || z.prediction.level === 'High'),
  ).length
  const avgScore =
    scored.length > 0
      ? (scored.reduce((sum, z) => sum + (z.prediction?.score ?? 0), 0) / scored.length).toFixed(1)
      : '—'
  const latestFetchedAt = zones
    .map((z) => z.weather?.fetchedAt)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1)
  const lastUpdate = latestFetchedAt ? `${formatTimeIST(latestFetchedAt)} IST` : '—'

  const topZones = [...scored]
    .sort((a, b) => (b.prediction?.score ?? 0) - (a.prediction?.score ?? 0))
    .slice(0, 5)

  const provenanceTime = latestFetchedAt ? formatTimeIST(latestFetchedAt) : '—'

  return (
    <div className="flex flex-col gap-5">
      {loading ? <p className="text-[14px] text-(--muted)">Loading live data…</p> : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Zones Monitored" value="20" />
        <StatCard label="Critical + High Now" value={scored.length === 0 ? '—' : String(criticalHighCount)} />
        <StatCard label="Average Risk Score" value={avgScore} />
        <StatCard label="Last Live Update" value={lastUpdate} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="rounded-xl border border-(--border) bg-(--surface) p-5 lg:col-span-2">
          <p className="mb-4 text-[16px] font-bold text-(--text)">Top Risk Zones</p>
          {topZones.length === 0 ? (
            <p className="text-[14px] text-(--muted)">
              {loading ? 'Loading live data…' : 'No live scores available right now.'}
            </p>
          ) : (
            <div className="flex flex-col">
              {topZones.map((zone) => (
                <button
                  key={zone.location.id}
                  type="button"
                  onClick={() => onSelectZone(zone)}
                  className="flex w-full items-center gap-3 border-b border-(--border) py-3 text-left transition-colors last:border-b-0 last:pb-0 first:pt-0 hover:bg-(--surface-2)/50 active:bg-(--border)"
                >
                  <RiskDot level={zone.prediction?.level} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-(--text)">
                      {zone.location.name}
                    </span>
                    <span className="block truncate text-[12px] text-(--muted)">
                      {zone.location.state}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-[16px] font-bold whitespace-nowrap text-(--text)">
                      {zone.prediction ? Math.round(zone.prediction.score) : '—'}
                    </span>
                    {zone.prediction ? <LevelBadge level={zone.prediction.level} /> : null}
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className="mt-4 text-[12px] text-(--muted)">
            Source: Open-Meteo • fetched {provenanceTime}
          </p>
        </div>

        <div className="rounded-xl border border-(--border) bg-(--surface) p-5 lg:col-span-3">
          <p className="mb-4 text-[16px] font-bold text-(--text)">All Zones</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-(--border) text-left">
                  <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Zone</th>
                  <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">State</th>
                  <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Rain 24h</th>
                  <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Soil %</th>
                  <th className="pr-3 pb-3 font-medium whitespace-nowrap text-(--muted)">Score</th>
                  <th className="pb-3 font-medium whitespace-nowrap text-(--muted)">Level</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr
                    key={zone.location.id}
                    onClick={() => onSelectZone(zone)}
                    className="cursor-pointer border-b border-(--border) last:border-b-0 hover:bg-(--surface-2)"
                  >
                    <td className="max-w-[180px] truncate py-3 pr-3 font-medium text-(--text)">
                      {zone.location.name}
                    </td>
                    <td className="max-w-[140px] truncate py-3 pr-3 whitespace-nowrap text-(--muted)">
                      {zone.location.state}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap text-(--text)">
                      {zone.weather ? `${zone.weather.rainfall.toFixed(1)} mm` : '—'}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap text-(--text)">
                      {zone.weather ? zone.weather.soilMoisture.toFixed(1) : '—'}
                    </td>
                    <td className="py-3 pr-3 font-bold whitespace-nowrap text-(--text)">
                      {zone.prediction ? Math.round(zone.prediction.score) : '—'}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      {zone.prediction ? (
                        <LevelBadge level={zone.prediction.level} />
                      ) : (
                        <span className="text-[12px] font-medium whitespace-nowrap text-(--muted)">No data</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {zones.length === 0 && !loading ? (
            <p className="mt-3 text-[14px] text-(--muted)">No zones available.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
