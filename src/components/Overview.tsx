import type { ZoneWithScore } from './types'
import { LevelBadge, RiskDot, formatTimeIST, riskColor } from './risk'
import { levelRank, worstLevel } from '../ml/model'
import MiniMap from './MiniMap'

interface OverviewProps {
  zones: ZoneWithScore[]
  loading: boolean
  onSelectZone: (zone: ZoneWithScore) => void
  onOpenMap: () => void
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
      <p className="text-[28px] leading-none font-bold text-[#E8EEF7]">{value}</p>
      <p className="mt-2 text-[12px] font-medium tracking-wide text-[#8CA0B8] uppercase">{label}</p>
    </div>
  )
}

export default function Overview({ zones, loading, onSelectZone, onOpenMap }: OverviewProps) {
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
      {loading ? <p className="text-[14px] text-[#8CA0B8]">Loading live data…</p> : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Zones Monitored" value="20" />
        <StatCard label="Critical + High Now" value={scored.length === 0 ? '—' : String(criticalHighCount)} />
        <StatCard label="Average Risk Score" value={avgScore} />
        <StatCard label="Last Live Update" value={lastUpdate} />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#1E2D47]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2D47] bg-[#101A2E] px-5 py-4">
          <div>
            <p className="text-[16px] font-bold text-[#E8EEF7]">Live Risk Map</p>
            <p className="mt-0.5 text-[12px] text-[#8CA0B8]">
              Satellite view • 20 zones • tap a zone for details
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenMap}
            className="rounded-lg border border-[#1E2D47] bg-[#16233C] px-4 py-2 text-[13px] font-medium text-[#E8EEF7] transition-all duration-300 hover:bg-[#1E2D47] active:scale-[0.98]"
          >
            Open full live map →
          </button>
        </div>
        <MiniMap zones={zones} onSelectZone={onSelectZone} />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#1E2D47] bg-[#101A2E] px-5 py-3">
          {['Low', 'Moderate', 'High', 'Critical'].map((level) => (
            <span key={level} className="inline-flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full border-2"
                style={{
                  backgroundColor: `color-mix(in srgb, ${riskColor(level)} 30%, transparent)`,
                  borderColor: riskColor(level),
                }}
                aria-hidden="true"
              />
              <span className="text-[12px] text-[#E8EEF7]">{level}</span>
            </span>
          ))}
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border-2 border-[#8CA0B8] bg-[#8CA0B8]/30" aria-hidden="true" />
            <span className="text-[12px] text-[#8CA0B8]">No data</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5 lg:col-span-2">
          <p className="mb-4 text-[16px] font-bold text-[#E8EEF7]">Top Risk Zones</p>
          {topZones.length === 0 ? (
            <p className="text-[14px] text-[#8CA0B8]">
              {loading ? 'Loading live data…' : 'No live scores available right now.'}
            </p>
          ) : (
            <div className="flex flex-col">
              {topZones.map((zone) => (
                <button
                  key={zone.location.id}
                  type="button"
                  onClick={() => onSelectZone(zone)}
                  className="flex w-full items-center gap-3 border-b border-[#1E2D47] py-3 text-left transition-colors last:border-b-0 last:pb-0 first:pt-0 hover:bg-[#16233C]/50 active:bg-[#1E2D47]"
                >
                  <RiskDot level={zone.prediction?.level} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-[#E8EEF7]">
                      {zone.location.name}
                    </span>
                    <span className="block truncate text-[12px] text-[#8CA0B8]">
                      {zone.location.state}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-[16px] font-bold whitespace-nowrap text-[#E8EEF7]">
                      {zone.prediction ? Math.round(zone.prediction.score) : '—'}
                    </span>
                    {zone.prediction ? <LevelBadge level={zone.prediction.level} /> : null}
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className="mt-4 text-[12px] text-[#8CA0B8]">
            Source: Open-Meteo • fetched {provenanceTime}
          </p>
        </div>

        <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5 lg:col-span-3">
          <p className="mb-4 text-[16px] font-bold text-[#E8EEF7]">All Zones</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-[#1E2D47] text-left">
                  <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Zone</th>
                  <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">State</th>
                  <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Rain 24h</th>
                  <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Soil %</th>
                  <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Score</th>
                  <th className="pr-3 pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">Level</th>
                  <th className="pb-3 font-medium whitespace-nowrap text-[#8CA0B8]">3-day outlook</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr
                    key={zone.location.id}
                    onClick={() => onSelectZone(zone)}
                    className="cursor-pointer border-b border-[#1E2D47] last:border-b-0 hover:bg-[#16233C]"
                  >
                    <td className="max-w-[180px] truncate py-3 pr-3 font-medium text-[#E8EEF7]">
                      {zone.location.name}
                    </td>
                    <td className="max-w-[140px] truncate py-3 pr-3 whitespace-nowrap text-[#8CA0B8]">
                      {zone.location.state}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap text-[#E8EEF7]">
                      {zone.weather ? `${zone.weather.rainfall.toFixed(1)} mm` : '—'}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap text-[#E8EEF7]">
                      {zone.weather ? zone.weather.soilMoisture.toFixed(1) : '—'}
                    </td>
                    <td className="py-3 pr-3 font-bold whitespace-nowrap text-[#E8EEF7]">
                      {zone.prediction ? Math.round(zone.prediction.score) : '—'}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      {zone.prediction ? (
                        <LevelBadge level={zone.prediction.level} />
                      ) : (
                        <span className="text-[12px] font-medium whitespace-nowrap text-[#8CA0B8]">No data</span>
                      )}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      {zone.outlook && zone.outlook.length > 0 ? (
                        (() => {
                          const worst = worstLevel(zone.outlook.map((d) => d.level))
                          if (!worst) return <span className="text-[#8CA0B8]">—</span>
                          const rising =
                            zone.prediction != null && levelRank(worst) > levelRank(zone.prediction.level)
                          return (
                            <span className="inline-flex items-center gap-1.5">
                              <LevelBadge level={worst} />
                              {rising ? (
                                <span className="text-[13px] font-bold text-[#F87171]" title="Risk rising in next 3 days" aria-label="Risk rising">
                                  ↑
                                </span>
                              ) : null}
                            </span>
                          )
                        })()
                      ) : (
                        <span className="text-[#8CA0B8]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {zones.length === 0 && !loading ? (
            <p className="mt-3 text-[14px] text-[#8CA0B8]">No zones available.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
