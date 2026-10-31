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
        className="relative rounded-lg border border-[#D9D9D9] bg-[#E9E9E9] p-2.5 text-[#0F172A] transition-all duration-300 hover:bg-[#D9D9D9] active:scale-[0.95]"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F87171] px-1 text-[11px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute top-12 right-0 z-[1300] flex max-h-[70vh] w-[min(400px,92vw)] flex-col overflow-hidden rounded-[15px] border border-[#D9D9D9] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
          <div className="flex items-center justify-between gap-2 border-b border-[#D9D9D9] px-4 py-3">
            <p className="text-[17px] font-bold text-[#0F172A]">Notifications</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] text-[#64748B] hover:bg-[#E9E9E9] hover:text-[#0F172A]"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#D9D9D9] px-4 py-2.5">
            {SEVS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSevFilter(s)}
                aria-pressed={sevFilter === s}
                className={`rounded-full px-2.5 py-1 text-[13px] font-medium ${
                  sevFilter === s
                    ? 'bg-[#106EBE]/10 text-[#004F88]'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setHideRead((h) => !h)}
              aria-pressed={hideRead}
              className={`ml-auto rounded-full px-2.5 py-1 text-[13px] font-medium ${
                hideRead ? 'bg-[#106EBE]/10 text-[#004F88]' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Unread only
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-[14px] text-[#64748B]">
                No notifications. Threshold crossings, data failures and new hazard reports will
                appear here.
              </p>
            ) : (
              filtered.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 border-b border-[#D9D9D9] px-4 py-3 last:border-b-0 ${
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
                      <p className="text-[15px] leading-snug font-medium text-[#0F172A]">{n.title}</p>
                      {!n.read ? (
                        <button
                          type="button"
                          onClick={() => onMarkRead(n.id)}
                          className="shrink-0 rounded px-1.5 py-0.5 text-[13px] text-[#64748B] hover:bg-[#E9E9E9] hover:text-[#0F172A]"
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[14px] leading-relaxed text-[#64748B]">{n.body}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[12px] font-bold"
                        style={{
                          backgroundColor: `${SEV_COLOR[n.severity]}22`,
                          color: SEV_COLOR[n.severity],
                        }}
                      >
                        {n.severity}
                      </span>
                      <span className="text-[13px] text-[#64748B]">
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
                          className="inline-flex items-center gap-1 rounded-full border border-[#D9D9D9] px-2 py-0.5 text-[13px] text-[#004F88] hover:bg-[#E9E9E9]"
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

          <div className="border-t border-[#D9D9D9] px-4 py-2.5">
            <button
              type="button"
              onClick={() => {
                onViewAll()
                setOpen(false)
              }}
              className="w-full rounded-lg bg-[#E9E9E9] py-2 text-[14px] font-medium text-[#0F172A] hover:bg-[#D9D9D9]"
            >
              View All Alerts
            </button>
            <p className="mt-1.5 text-center text-[12px] leading-relaxed text-[#64748B]">
              Computed from live data every ~12 min on this device — no push delivery.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
