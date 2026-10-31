import { ChevronDown, CloudRain, CloudSun, MapPin, Shield } from 'lucide-react'
import type { FeedState } from '../../services/dataQuality'
import type { Notification } from '../../services/notifications'
import NotificationCentre from './NotificationCentre'

interface TopBarProps {
  lastUpdated: string
  avgTempC: number | null
  condition: string
  feedState: FeedState
  notifications: Notification[]
  unread: number
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onOpenLocation: (zoneId: string) => void
  onViewAllAlerts: () => void
  onHome: () => void
}

const PILL: Record<FeedState, { bg: string; border: string; color: string; dot: string; label: string }> = {
  live: {
    bg: 'rgba(52,211,153,0.10)',
    border: 'rgba(52,211,153,0.30)',
    color: '#34D399',
    dot: '#34D399',
    label: 'Live Data',
  },
  stale: {
    bg: 'rgba(251,191,36,0.10)',
    border: 'rgba(251,191,36,0.30)',
    color: '#FBBF24',
    dot: '#FBBF24',
    label: 'Data Stale',
  },
  unavailable: {
    bg: 'rgba(148,163,184,0.10)',
    border: 'rgba(148,163,184,0.30)',
    color: '#94A3B8',
    dot: '#94A3B8',
    label: 'Data Unavailable',
  },
  loading: {
    bg: 'rgba(148,163,184,0.10)',
    border: 'rgba(148,163,184,0.30)',
    color: '#94A3B8',
    dot: '#94A3B8',
    label: 'Loading…',
  },
}

/** Top bar. The data pill reflects verified freshness — never a fake "live". */
export default function TopBar({
  lastUpdated,
  avgTempC,
  condition,
  feedState,
  notifications,
  unread,
  onMarkRead,
  onMarkAllRead,
  onOpenLocation,
  onViewAllAlerts,
  onHome,
}: TopBarProps) {
  const pill = PILL[feedState]
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
          <span className="block text-[17px] leading-tight font-bold text-[#E8EEF7]">NE-SHIELD</span>
          <span className="block text-[13px] leading-tight text-[#8CA0B8]">
            Landslide Early Warning System
          </span>
        </span>
      </button>

      <span className="ml-2 inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#1E2D47] bg-[#16233C] px-3 py-2 text-[14px] font-medium text-[#E8EEF7]">
        <MapPin className="h-4 w-4 text-[#3B82F6]" aria-hidden="true" />
        Northeast India
      </span>

      <span className="shrink-0 text-[13px] leading-tight text-[#8CA0B8]">
        Last Updated
        <span className="block font-medium text-[#E8EEF7]">{lastUpdated}</span>
      </span>

      <span
        className="inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium"
        style={{ backgroundColor: pill.bg, borderColor: pill.border, color: pill.color }}
        title={
          feedState === 'live'
            ? 'Source reachable and data fresh'
            : 'Data is stale or unavailable — treat zones with caution'
        }
      >
        <span
          className={`h-2 w-2 rounded-full ${feedState === 'live' ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: pill.dot }}
          aria-hidden="true"
        />
        {pill.label}
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-4">
        <span className="hidden items-center gap-2 text-[14px] text-[#E8EEF7] lg:inline-flex">
          {condition === 'Clear' ? (
            <CloudSun className="h-5 w-5 text-[#FBBF24]" aria-hidden="true" />
          ) : (
            <CloudRain className="h-5 w-5 text-[#60A5FA]" aria-hidden="true" />
          )}
          <span className="text-left leading-tight">
            <span className="block font-bold">{avgTempC != null ? `${avgTempC.toFixed(0)}°C` : '—'}</span>
            <span className="block text-[13px] text-[#8CA0B8]">{condition}</span>
          </span>
        </span>

        <NotificationCentre
          notifications={notifications}
          unread={unread}
          onMarkRead={onMarkRead}
          onMarkAllRead={onMarkAllRead}
          onOpenLocation={onOpenLocation}
          onViewAll={onViewAllAlerts}
        />

        <span className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3B82F6]/20 text-[13px] font-bold text-[#60A5FA]">
            CR
          </span>
          <span className="hidden text-left leading-tight xl:block">
            <span className="block text-[14px] font-medium text-[#E8EEF7]">Control Room</span>
            <span className="block text-[13px] text-[#8CA0B8]">Operator</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-[#8CA0B8] xl:block" aria-hidden="true" />
        </span>
      </div>
    </header>
  )
}
