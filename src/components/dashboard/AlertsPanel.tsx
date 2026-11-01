import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck, Eye } from 'lucide-react'
import type { Alert } from '../../services/alerts'
import type { ZoneWithScore } from '../types'
import {
  LIFECYCLE_LABELS,
  OPERATOR_LABEL,
  getStatus,
  pruneStaleRecords,
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
  acknowledged: 'text-[#004F88]',
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

  // A genuinely re-raised alert must not inherit the old episode's terminal
  // status (Resolved/Rejected/...). Ids are live alerts + known reports.
  useEffect(() => {
    pruneStaleRecords([...alerts.map((a) => a.id), ...reports.map((r) => r.id)])
  }, [alerts, reports])

  const filtered = useMemo(
    () => alerts.filter((a) => sevFilter === 'All' || a.severity === sevFilter),
    [alerts, sevFilter],
  )

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
      <div className="flex h-full flex-col rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Bell className="h-4 w-4 text-[#F87171]" aria-hidden="true" />
          <p className="text-[18px] font-bold text-[#0F172A]">Active Alerts</p>
          <span className="text-[13px] text-[#64748B]">({filtered.length})</span>
          <div className="ml-auto flex gap-1.5">
            {SEV_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSevFilter(s)}
                aria-pressed={sevFilter === s}
                className={`rounded-full px-2.5 py-1 text-[13px] font-medium ${
                  sevFilter === s ? 'bg-[#106EBE]/25 text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-[14px] leading-relaxed text-[#64748B]">
            No active alerts. All zones with fresh data are currently below High risk.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((alert) => {
              const status = getStatus(alert.id)
              return (
                <div
                  key={alert.id}
                  className="flex flex-wrap items-start gap-3 rounded-lg border border-[#D9D9D9] bg-[#F0F0F0] p-3"
                >
                  <span
                    className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[12px] font-bold whitespace-nowrap"
                    style={{
                      backgroundColor: SEVERITY_BG[alert.severity],
                      color: riskColor(alert.severity),
                    }}
                  >
                    {alert.severity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-snug font-medium text-[#0F172A]">{alert.title}</p>
                    <p className="mt-0.5 text-[14px] leading-relaxed text-[#64748B]">{alert.detail}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-[#64748B]">
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
                        className="inline-flex items-center gap-1 rounded-lg border border-[#D9D9D9] bg-white px-2.5 py-1.5 text-[13px] text-[#0F172A] hover:bg-[#E9E9E9]"
                      >
                        <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Ack
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onSelectZone(alert.zoneId)}
                      className="rounded-lg border border-[#D9D9D9] bg-white px-2.5 py-1.5 text-[13px] text-[#0F172A] hover:bg-[#E9E9E9]"
                    >
                      Map
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailAlert(alert)}
                      className="inline-flex items-center gap-1 rounded-full bg-[#106EBE] px-2.5 py-1.5 text-[13px] font-medium text-white hover:bg-[#004F88]"
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
        <p className="mt-3 text-[13px] leading-relaxed text-[#64748B]">
          Model-generated alerts — not official government warnings. Acknowledgement is stored in
          this browser only ({OPERATOR_LABEL}).
        </p>
      </div>

      {reports.length > 0 ? (
        <div className="rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
          <p className="mb-1 text-[18px] font-bold text-[#0F172A]">Hazard Report Review</p>
          <p className="mb-4 text-[13px] leading-relaxed text-[#64748B]">
            Submitted reports are <span className="text-[#FBBF24]">never</span> auto-verified as real
            landslides. Review each one explicitly.
          </p>
          <div className="flex flex-col gap-3">
            {reports.map((r) => {
              const status = getStatus(r.id)
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-start gap-3 rounded-lg border border-[#D9D9D9] bg-[#F0F0F0] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-[#0F172A]">
                      {r.location}{' '}
                      <span className="ml-1 rounded-full border border-[#D9D9D9] bg-[#E9E9E9] px-2 py-0.5 text-[12px] text-[#64748B]">
                        {r.type}
                      </span>
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[14px] leading-relaxed text-[#64748B]">{r.description}</p>
                    <p className="mt-1 text-[13px] text-[#64748B]">
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
                          className="rounded-lg border border-[#D9D9D9] bg-white px-2.5 py-1.5 text-[13px] text-[#0F172A] hover:bg-[#E9E9E9] disabled:opacity-40"
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
        </div>
      ) : null}

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
