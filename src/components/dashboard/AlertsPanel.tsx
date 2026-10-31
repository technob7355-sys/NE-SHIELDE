import { useMemo, useState } from 'react'
import { Bell, CheckCheck, Eye } from 'lucide-react'
import type { Alert } from '../../services/alerts'
import type { ZoneWithScore } from '../types'
import {
  LIFECYCLE_LABELS,
  OPERATOR_LABEL,
  getLog,
  getStatus,
  setStatus,
} from '../../services/alertStore'
import { loadReports, type HazardReport } from '../../services/reports'
import { formatDateTimeIST, formatTimeIST, riskColor } from '../risk'
import AlertDetailModal from '../AlertDetailModal'

interface AlertsPanelProps {
  alerts: Alert[]
  zones: ZoneWithScore[]
  onSelectZone: (zoneId: string) => void
}

const SEVERITY_BG: Record<Alert['severity'], string> = {
  Critical: 'rgba(248,113,113,0.15)',
  High: 'rgba(251,146,60,0.15)',
  Moderate: 'rgba(251,191,36,0.15)',
}

const STATUS_STYLE: Record<string, string> = {
  new: 'text-[#94A3B8]',
  pending_verification: 'text-[#FBBF24]',
  acknowledged: 'text-[#60A5FA]',
  under_investigation: 'text-[#A78BFA]',
  action_required: 'text-[#FB923C]',
  resolved: 'text-[#34D399]',
  rejected: 'text-[#94A3B8]',
  duplicate: 'text-[#94A3B8]',
  invalid: 'text-[#F87171]',
}

const SEV_FILTERS = ['All', 'Critical', 'High', 'Moderate'] as const

/**
 * Alert management: model-generated alerts with a per-browser lifecycle
 * (acknowledge / investigate / resolve), hazard-report review queue, and a
 * local action history. Multi-operator sync needs a backend — see the
 * backend-gaps note in the report.
 */
export default function AlertsPanel({ alerts, zones, onSelectZone }: AlertsPanelProps) {
  const [sevFilter, setSevFilter] = useState<(typeof SEV_FILTERS)[number]>('All')
  const [detailAlert, setDetailAlert] = useState<Alert | null>(null)
  const [tick, setTick] = useState(0)
  const [reports, setReports] = useState<HazardReport[]>(() => loadReports())

  const refresh = () => setTick((t) => t + 1)
  void tick

  const filtered = useMemo(
    () => alerts.filter((a) => sevFilter === 'All' || a.severity === sevFilter),
    [alerts, sevFilter],
  )
  const log = useMemo(() => getLog().slice(0, 30), [tick])

  const quickAck = (id: string) => {
    setStatus(id, 'acknowledged')
    refresh()
  }

  const reviewReport = (id: string, status: 'under_investigation' | 'rejected' | 'duplicate' | 'invalid') => {
    setStatus(id, status)
    setReports(loadReports())
    refresh()
  }

  return (
    <div id="alerts" className="flex flex-col gap-5">
      <div className="flex h-full flex-col rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Bell className="h-4 w-4 text-[#F87171]" aria-hidden="true" />
          <p className="text-[16px] font-bold text-[#E8EEF7]">Active Alerts</p>
          <span className="text-[12px] text-[#8CA0B8]">({filtered.length})</span>
          <div className="ml-auto flex gap-1.5">
            {SEV_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSevFilter(s)}
                aria-pressed={sevFilter === s}
                className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
                  sevFilter === s ? 'bg-[#3B82F6]/25 text-[#E8EEF7]' : 'text-[#8CA0B8] hover:text-[#E8EEF7]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-[14px] leading-relaxed text-[#8CA0B8]">
            No active alerts. All zones with fresh data are currently below High risk.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((alert) => {
              const status = getStatus(alert.id)
              return (
                <div
                  key={alert.id}
                  className="flex flex-wrap items-start gap-3 rounded-lg border border-[#1E2D47] bg-[#0B1220]/60 p-3"
                >
                  <span
                    className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap"
                    style={{
                      backgroundColor: SEVERITY_BG[alert.severity],
                      color: riskColor(alert.severity),
                    }}
                  >
                    {alert.severity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] leading-snug font-medium text-[#E8EEF7]">{alert.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-[#8CA0B8]">{alert.detail}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-[#8CA0B8]">
                      <span>{formatTimeIST(alert.time)} IST</span>
                      <span className={STATUS_STYLE[status] ?? ''}>
                        {LIFECYCLE_LABELS[status]}
                      </span>
                      <span>Team: not configured</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {status === 'new' || status === 'pending_verification' ? (
                      <button
                        type="button"
                        onClick={() => quickAck(alert.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#1E2D47] bg-[#16233C] px-2.5 py-1.5 text-[12px] text-[#E8EEF7] hover:bg-[#1E2D47]"
                      >
                        <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Ack
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onSelectZone(alert.zoneId)}
                      className="rounded-lg border border-[#1E2D47] bg-[#16233C] px-2.5 py-1.5 text-[12px] text-[#E8EEF7] hover:bg-[#1E2D47]"
                    >
                      Map
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailAlert(alert)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#3B82F6] px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-[#2563EB]"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      Details
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p className="mt-3 text-[12px] leading-relaxed text-[#8CA0B8]">
          Model-generated alerts — not official government warnings. Acknowledgement is stored in
          this browser only ({OPERATOR_LABEL}).
        </p>
      </div>

      <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
        <p className="mb-1 text-[16px] font-bold text-[#E8EEF7]">Hazard Report Review</p>
        <p className="mb-4 text-[12px] leading-relaxed text-[#8CA0B8]">
          Submitted reports are <span className="text-[#FBBF24]">never</span> auto-verified as real
          landslides. Review each one explicitly.
        </p>
        {reports.length === 0 ? (
          <p className="text-[14px] text-[#8CA0B8]">No reports submitted yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((r) => {
              const status = getStatus(r.id)
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-start gap-3 rounded-lg border border-[#1E2D47] bg-[#0B1220]/60 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#E8EEF7]">
                      {r.location}{' '}
                      <span className="ml-1 rounded-full border border-[#1E2D47] bg-[#16233C] px-2 py-0.5 text-[12px] text-[#8CA0B8]">
                        {r.type}
                      </span>
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-[#8CA0B8]">{r.description}</p>
                    <p className="mt-1 text-[12px] text-[#8CA0B8]">
                      {formatDateTimeIST(r.time)} IST •{' '}
                      <span className={STATUS_STYLE[status] ?? ''}>{LIFECYCLE_LABELS[status]}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {(['under_investigation', 'rejected', 'duplicate', 'invalid'] as const).map(
                      (s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => reviewReport(r.id, s)}
                          disabled={status === s}
                          className="rounded-lg border border-[#1E2D47] bg-[#16233C] px-2.5 py-1.5 text-[12px] text-[#E8EEF7] hover:bg-[#1E2D47] disabled:opacity-40"
                        >
                          {LIFECYCLE_LABELS[s]}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
        <p className="mb-1 text-[16px] font-bold text-[#E8EEF7]">Action History</p>
        <p className="mb-3 text-[12px] text-[#8CA0B8]">
          This browser only — a shared audit log needs a backend (see backend gaps).
        </p>
        {log.length === 0 ? (
          <p className="text-[13px] text-[#8CA0B8]">No actions recorded yet.</p>
        ) : (
          <div className="flex max-h-[240px] flex-col gap-1.5 overflow-y-auto">
            {log.map((e, i) => (
              <p key={i} className="text-[13px] leading-relaxed text-[#8CA0B8]">
                <span className="text-[#E8EEF7]">{formatDateTimeIST(e.at)} IST</span> — {e.by}:{' '}
                {e.action} <span className="font-mono text-[12px]">({e.targetId})</span>
                {e.detail ? ` — ${e.detail}` : ''}
              </p>
            ))}
          </div>
        )}
      </div>

      {detailAlert ? (
        <AlertDetailModal
          alert={detailAlert}
          zone={zones.find((z) => z.location.id === detailAlert.zoneId)}
          onClose={() => setDetailAlert(null)}
          onChanged={refresh}
        />
      ) : null}
    </div>
  )
}
