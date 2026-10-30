import { useMemo } from 'react'
import type { ZoneWithScore } from '../types'
import type { Alert } from '../../services/alerts'
import StatCards from './StatCards'
import DashboardMap from './DashboardMap'
import LocationDetails from './LocationDetails'
import AlertsPanel from './AlertsPanel'
import RainfallChart from './RainfallChart'
import OutlookChart from './OutlookChart'

interface OverviewDashboardProps {
  zones: ZoneWithScore[]
  loading: boolean
  alerts: Alert[]
  focusZone: ZoneWithScore | null
  onSelectZone: (zone: ZoneWithScore) => void
  onSelectZoneId: (zoneId: string) => void
  onOpenMap: () => void
}

/**
 * TerraGuard-style command dashboard. Every number on this screen comes
 * from live Open-Meteo data or the real historical record — nothing simulated.
 */
export default function OverviewDashboard({
  zones,
  loading,
  alerts,
  focusZone,
  onSelectZone,
  onSelectZoneId,
  onOpenMap,
}: OverviewDashboardProps) {
  const rainZone = useMemo(() => {
    const scored = zones.filter((z) => z.weather && z.weather.recentHourlyRain.length > 0)
    return (
      [...scored].sort((a, b) => (b.weather?.rainfall ?? 0) - (a.weather?.rainfall ?? 0))[0] ?? null
    )
  }, [zones])

  const outlookDays = useMemo(() => {
    const scored = zones.filter((z) => z.outlook && z.outlook.length > 0)
    const worst = [...scored].sort(
      (a, b) =>
        Math.max(...(b.outlook?.map((d) => d.score) ?? [0])) -
        Math.max(...(a.outlook?.map((d) => d.score) ?? [0])),
    )[0]
    return worst?.outlook ?? []
  }, [zones])

  return (
    <div className="flex flex-col gap-5">
      {loading ? <p className="text-[14px] text-[#8CA0B8]">Loading live data…</p> : null}

      <StatCards zones={zones} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DashboardMap zones={zones} onSelectZone={onSelectZone} />
        </div>
        <LocationDetails zone={focusZone} onViewOnMap={onOpenMap} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <AlertsPanel alerts={alerts} onSelectZone={onSelectZoneId} />

        <div className="flex flex-col rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
          <p className="mb-1 text-[16px] font-bold text-[#E8EEF7]">Rainfall Trend (Last 24 Hours)</p>
          <p className="mb-3 text-[12px] text-[#8CA0B8]">
            {rainZone ? `${rainZone.location.name} — wettest zone` : 'Waiting for live data'}
          </p>
          <div className="flex flex-1 items-center">
            {rainZone ? (
              <RainfallChart values={rainZone.weather!.recentHourlyRain} />
            ) : (
              <p className="text-[14px] text-[#8CA0B8]">No data yet.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
          <p className="mb-1 text-[16px] font-bold text-[#E8EEF7]">Risk Outlook (Next 3 Days)</p>
          <p className="mb-3 text-[12px] text-[#8CA0B8]">Highest forecast score across zones</p>
          <div className="flex flex-1 items-center">
            {outlookDays.length > 0 ? (
              <OutlookChart days={outlookDays} />
            ) : (
              <p className="text-[14px] text-[#8CA0B8]">No data yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
