import { Bell, ChevronDown, CloudRain, CloudSun, MapPin, Shield } from 'lucide-react'

interface TopBarProps {
  lastUpdated: string
  avgTempC: number | null
  condition: string
  alertCount: number
  onAlertsClick: () => void
  onHome: () => void
}

/** TerraGuard-style top bar. Every value is real: live Open-Meteo data only. */
export default function TopBar({
  lastUpdated,
  avgTempC,
  condition,
  alertCount,
  onAlertsClick,
  onHome,
}: TopBarProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 hidden h-16 items-center gap-4 border-b border-[#1E2D47] bg-[#101A2E] px-5 md:flex">
      <button
        type="button"
        onClick={onHome}
        className="flex shrink-0 items-center gap-2.5 transition-all duration-300 active:scale-[0.97]"
        aria-label="Go to home"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3B82F6]">
          <Shield className="h-5 w-5 text-white" aria-hidden="true" />
        </span>
        <span className="text-left">
          <span className="block text-[16px] leading-tight font-bold text-[#E8EEF7]">NE-SHIELD</span>
          <span className="block text-[11px] leading-tight text-[#8CA0B8]">
            Landslide Early Warning System
          </span>
        </span>
      </button>

      <span className="ml-2 inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#1E2D47] bg-[#16233C] px-3 py-2 text-[13px] font-medium text-[#E8EEF7]">
        <MapPin className="h-4 w-4 text-[#3B82F6]" aria-hidden="true" />
        Northeast India
      </span>

      <span className="shrink-0 text-[12px] leading-tight text-[#8CA0B8]">
        Last Updated
        <span className="block font-medium text-[#E8EEF7]">{lastUpdated}</span>
      </span>

      <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-3 py-1.5 text-[12px] font-medium text-[#34D399]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#34D399]" aria-hidden="true" />
        Live Data
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-4">
        <span className="hidden items-center gap-2 text-[13px] text-[#E8EEF7] lg:inline-flex">
          {condition === 'Clear' ? (
            <CloudSun className="h-5 w-5 text-[#FBBF24]" aria-hidden="true" />
          ) : (
            <CloudRain className="h-5 w-5 text-[#60A5FA]" aria-hidden="true" />
          )}
          <span className="text-left leading-tight">
            <span className="block font-bold">{avgTempC != null ? `${avgTempC.toFixed(0)}°C` : '—'}</span>
            <span className="block text-[11px] text-[#8CA0B8]">{condition}</span>
          </span>
        </span>

        <button
          type="button"
          onClick={onAlertsClick}
          className="relative rounded-lg border border-[#1E2D47] bg-[#16233C] p-2.5 text-[#E8EEF7] transition-all duration-300 hover:bg-[#1E2D47] active:scale-[0.95]"
          aria-label={`Alerts${alertCount > 0 ? `, ${alertCount} active` : ''}`}
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {alertCount > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F87171] px-1 text-[10px] font-bold text-white">
              {alertCount}
            </span>
          ) : null}
        </button>

        <span className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3B82F6]/20 text-[13px] font-bold text-[#60A5FA]">
            BS
          </span>
          <span className="hidden text-left leading-tight xl:block">
            <span className="block text-[13px] font-medium text-[#E8EEF7]">Bhim Singh</span>
            <span className="block text-[11px] text-[#8CA0B8]">Student</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-[#8CA0B8] xl:block" aria-hidden="true" />
        </span>
      </div>
    </header>
  )
}
