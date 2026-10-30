import { Bell } from 'lucide-react'
import type { Alert } from '../../services/alerts'
import { formatTimeIST, riskColor } from '../risk'

interface AlertsPanelProps {
  alerts: Alert[]
  onSelectZone: (zoneId: string) => void
}

const SEVERITY_BG: Record<Alert['severity'], string> = {
  Critical: 'rgba(248,113,113,0.15)',
  High: 'rgba(251,146,60,0.15)',
  Moderate: 'rgba(251,191,36,0.15)',
}

/** Real alerts from live data — current High/Critical zones + rising outlooks. */
export default function AlertsPanel({ alerts, onSelectZone }: AlertsPanelProps) {
  return (
    <div id="alerts" className="flex h-full flex-col rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Bell className="h-4 w-4 text-[#F87171]" aria-hidden="true" />
        <p className="text-[16px] font-bold text-[#E8EEF7]">Recent Alerts</p>
      </div>
      {alerts.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-[#8CA0B8]">
          No active alerts. All 20 zones are currently at Low or Moderate risk with no rising
          3-day outlook.
        </p>
      ) : (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {alerts.slice(0, 6).map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => onSelectZone(alert.zoneId)}
              className="flex items-start gap-3 rounded-lg border border-[#1E2D47] bg-[#0B1220]/60 p-3 text-left transition-all duration-300 hover:bg-[#16233C] active:scale-[0.99]"
            >
              <span
                className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap"
                style={{ backgroundColor: SEVERITY_BG[alert.severity], color: riskColor(alert.severity === 'Moderate' ? 'Moderate' : alert.severity) }}
              >
                {alert.severity === 'Critical' ? 'Very High' : alert.severity}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-[#E8EEF7]">
                  {alert.title}
                </span>
                <span className="block truncate text-[12px] text-[#8CA0B8]">{alert.detail}</span>
              </span>
              <span className="shrink-0 text-[11px] whitespace-nowrap text-[#8CA0B8]">
                {formatTimeIST(alert.time)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
