import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CheckCheck, MapPin } from 'lucide-react'
import type { Notification, NotificationSeverity } from '../../services/notifications'
import { formatDateTimeIST } from '../risk'

const SEV_COLOR: Record<NotificationSeverity, string> = {
  Critical: '#F87171',
  High: '#FB923C',
  Moderate: '#FBBF24',
  Info: '#60A5FA',
}

const SEVS: ('All' | NotificationSeverity)[] = ['All', 'Critical', 'High', 'Moderate', 'Info']

interface NotificationCentreProps {
  notifications: Notification[]
  unread: number
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onOpenLocation: (zoneId: string) => void
  onViewAll: () => void
}

/**
 * Notification centre (per-browser). Notifications are computed from live
 * data on the app's polling cycle — there is no push/WebSocket delivery.
 */
export default function NotificationCentre({
  notifications,
  unread,
  onMarkRead,
  onMarkAllRead,
  onOpenLocation,
  onViewAll,
}: NotificationCentreProps) {
  const [open, setOpen] = useState(false)
  const [sevFilter, setSevFilter] = useState<(typeof SEVS)[number]>('All')
  const [hideRead, setHideRead] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open ])

  const filtered = useMemo(
    () =>
      notifications.filter(
        (n) =>
          (sevFilter === 'All' || n.severity === sevFilter) && (!hideRead || !n.read),
      ),
    [notifications, sevFilter, hideRead],
  )

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        className="relative rounded-lg border border-[#1E2D47] bg-[#16233C] p-2.5 text-[#E8EEF7] transition-all duration-300 hover:bg-[#1E2D47] active:scale-[0.95]"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F87171] px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute top-12 right-0 z-[1300] flex max-h-[70vh] w-[min(400px,92vw)] flex-col overflow-hidden rounded-xl border border-[#1E2D47] bg-[#0B1220] shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-[#1E2D47] px-4 py-3">
            <p className="text-[15px] font-bold text-[#E8EEF7]">Notifications</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] text-[#8CA0B8] hover:bg-[#16233C] hover:text-[#E8EEF7]"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#1E2D47] px-4 py-2.5">
            {SEVS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSevFilter(s)}
                aria-pressed={sevFilter === s}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  sevFilter === s
                    ? 'bg-[#3B82F6]/25 text-[#E8EEF7]'
                    : 'text-[#8CA0B8] hover:text-[#E8EEF7]'
                }`}
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setHideRead((h) => !h)}
              aria-pressed={hideRead}
              className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-medium ${
                hideRead ? 'bg-[#3B82F6]/25 text-[#E8EEF7]' : 'text-[#8CA0B8] hover:text-[#E8EEF7]'
              }`}
            >
              Unread only
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-[#8CA0B8]">
                No notifications. Threshold crossings, data failures and new hazard reports will
                appear here.
              </p>
            ) : (
              filtered.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 border-b border-[#1E2D47] px-4 py-3 last:border-b-0 ${
                    n.read ? 'opacity-60' : ''
                  }`}
                >
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: SEV_COLOR[n.severity] }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium text-[#E8EEF7]">{n.title}</p>
                      {!n.read ? (
                        <button
                          type="button"
                          onClick={() => onMarkRead(n.id)}
                          className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-[#8CA0B8] hover:bg-[#16233C] hover:text-[#E8EEF7]"
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-[#8CA0B8]">{n.body}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          backgroundColor: `${SEV_COLOR[n.severity]}22`,
                          color: SEV_COLOR[n.severity],
                        }}
                      >
                        {n.severity}
                      </span>
                      <span className="text-[11px] text-[#8CA0B8]">
                        {formatDateTimeIST(n.createdAt)} IST
                      </span>
                      {n.zoneId ? (
                        <button
                          type="button"
                          onClick={() => {
                            onMarkRead(n.id)
                            onOpenLocation(n.zoneId!)
                            setOpen(false)
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-[#1E2D47] px-2 py-0.5 text-[11px] text-[#60A5FA] hover:bg-[#16233C]"
                        >
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          Open location
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[#1E2D47] px-4 py-2.5">
            <button
              type="button"
              onClick={() => {
                onViewAll()
                setOpen(false)
              }}
              className="w-full rounded-lg bg-[#16233C] py-2 text-[13px] font-medium text-[#E8EEF7] hover:bg-[#1E2D47]"
            >
              View All Alerts
            </button>
            <p className="mt-1.5 text-center text-[10px] leading-relaxed text-[#8CA0B8]">
              Computed from live data every ~12 min on this device — no push delivery.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
