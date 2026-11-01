import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Alert } from '../services/alerts'
import type { ZoneWithScore } from './types'
import {
  LIFECYCLE_FLOW,
  LIFECYCLE_LABELS,
  OPERATOR_LABEL,
  addNote,
  getLogFor,
  getRecord,
  setStatus,
  type LifecycleStatus,
} from '../services/alertStore'
import { formatDateTimeIST, formatTimeIST, LevelBadge } from './risk'
import { RISK_THRESHOLDS } from '../config/thresholds'
import { canAckAlerts, useRole } from '../services/roles'
import { zoneQuality } from '../services/dataQuality'
import DataQualityBadge from './dashboard/DataQualityBadge'

const SEV_COLOR: Record<Alert['severity'], string> = {
  Critical: '#F87171',
  High: '#FB923C',
  Moderate: '#FBBF24',
}

interface AlertDetailModalProps {
  alert: Alert
  zone: ZoneWithScore | undefined
  onClose: () => void
  onChanged: () => void
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-[14px] text-[#64748B]">{label}</span>
      <span className="text-right text-[14px] font-medium text-[#0F172A]">{value}</span>
    </div>
  )
}

/** Full detail for one alert: provenance, inputs, lifecycle, notes. */
export default function AlertDetailModal({ alert, zone, onClose, onChanged }: AlertDetailModalProps) {
  const [noteText, setNoteText] = useState('')
  const [record, setRecord] = useState(() => getRecord(alert.id))
  const role = useRole()
  const status: LifecycleStatus = record?.status ?? 'new'
  const log = getLogFor(alert.id)
  const quality = zone ? zoneQuality(zone) : null
  const score = zone?.prediction ? Math.round(zone.prediction.score) : null

  const changeStatus = (s: LifecycleStatus) => {
    setRecord(setStatus(alert.id, s))
    onChanged()
  }

  const submitNote = () => {
    if (!noteText.trim()) return
    setRecord(addNote(alert.id, noteText))
    setNoteText('')
    onChanged()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Alert detail: ${alert.title}`}
    >
      <div
        className="flex max-h-[88vh] w-[min(620px,96vw)] flex-col overflow-hidden rounded-[15px] border border-[#D9D9D9] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#D9D9D9] p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded px-2 py-0.5 text-[12px] font-bold"
                style={{
                  backgroundColor: `${SEV_COLOR[alert.severity]}22`,
                  color: SEV_COLOR[alert.severity],
                }}
              >
                {alert.severity}
              </span>
              <span className="rounded-full border border-[#D9D9D9] bg-[#E9E9E9] px-2 py-0.5 text-[12px] font-medium text-[#0F172A]">
                {LIFECYCLE_LABELS[status]}
              </span>
              {quality ? <DataQualityBadge status={quality.status} /> : null}
            </div>
            <p className="mt-2 text-[18px] font-bold text-[#0F172A]">{alert.title}</p>
            <p className="mt-0.5 font-mono text-[13px] text-[#64748B]">ID: {alert.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close alert detail"
            className="shrink-0 rounded-lg border border-[#D9D9D9] bg-white p-2 text-[#0F172A] transition-colors hover:bg-[#E9E9E9]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="divide-y divide-[#D9D9D9] rounded-xl border border-[#D9D9D9] px-4">
            <Row label="Type" value="Model-generated threshold alert" />
            <Row
              label="Location"
              value={
                zone
                  ? `${zone.location.name}, ${zone.location.state} (${zone.location.lat.toFixed(3)}° N, ${zone.location.lng.toFixed(3)}° E)`
                  : alert.zoneName
              }
            />
            <Row label="Raised at" value={`${formatDateTimeIST(alert.time)} IST`} />
            <Row label="Trigger" value={alert.detail} />
            <Row
              label="Score / threshold"
              value={
                score != null
                  ? `${score} (Critical ≥${RISK_THRESHOLDS.critical} · High ≥${RISK_THRESHOLDS.high} · Moderate ≥${RISK_THRESHOLDS.moderate})`
                  : '— (no live score)'
              }
            />
            <Row
              label="Inputs at trigger"
              value={
                zone?.weather
                  ? `${zone.weather.rainfall.toFixed(1)} mm/24h · soil ${zone.weather.soilMoisture.toFixed(0)}% (est.) · slope ${zone.location.slope}°`
                  : '—'
              }
            />
            <Row
              label="Data freshness"
              value={
                quality?.fetchedAt
                  ? `${formatTimeIST(quality.fetchedAt)} IST (${quality.ageMin} min ago)`
                  : 'No data'
              }
            />
            <Row label="Responsible team" value="Not configured" />
          </div>

          <p className="mt-3 rounded-xl border border-[#FBBF24]/30 bg-[#FBBF24]/8 p-3 text-[14px] leading-relaxed text-[#FBBF24]">
            Verification: model-generated — not verified as a real landslide event. Not an official
            government warning.
          </p>

          <p className="mt-5 mb-2 text-[16px] font-bold text-[#0F172A]">Change status</p>
          {canAckAlerts(role) ? (
            <div className="flex flex-wrap gap-2">
              {LIFECYCLE_FLOW[status].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeStatus(s)}
                  className="rounded-lg border border-[#D9D9D9] bg-white px-3 py-1.5 text-[14px] font-medium text-[#0F172A] hover:bg-[#E9E9E9]"
                >
                  {LIFECYCLE_LABELS[s]}
                </button>
              ))}
              {LIFECYCLE_FLOW[status].length === 0 ? (
                <p className="text-[14px] text-[#64748B]">Terminal state — no further transitions.</p>
              ) : null}
            </div>
          ) : (
            <p className="text-[14px] text-[#64748B]">
              Status changes require the Control-Room Operator demo role.
            </p>
          )}

          <p className="mt-5 mb-2 text-[16px] font-bold text-[#0F172A]">Investigation notes</p>
          {canAckAlerts(role) ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitNote()}
              placeholder="Add a note…"
              aria-label="Add investigation note"
              className="flex-1 rounded-lg border border-[#D9D9D9] bg-white px-3 py-2 text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:border-[#106EBE] focus:outline-none"
            />
            <button
              type="button"
              onClick={submitNote}
              className="rounded-full bg-[#106EBE] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#004F88]"
            >
              Add
            </button>
          </div>
          ) : null}
          {(record?.notes ?? []).length > 0 ? (
            <div className="mt-2 flex flex-col gap-2">
              {(record?.notes ?? []).map((n, i) => (
                <div key={i} className="rounded-lg border border-[#D9D9D9] bg-white p-3">
                  <p className="text-[14px] text-[#0F172A]">{n.text}</p>
                  <p className="mt-1 text-[13px] text-[#64748B]">
                    {n.by} • {formatDateTimeIST(n.at)} IST
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <p className="mt-5 mb-2 text-[16px] font-bold text-[#0F172A]">Timeline</p>
          <div className="flex flex-col gap-1.5">
            <p className="text-[13px] text-[#64748B]">
              {formatDateTimeIST(alert.time)} IST — alert raised ({alert.severity})
            </p>
            {log.map((e, i) => (
              <p key={i} className="text-[13px] text-[#64748B]">
                {formatDateTimeIST(e.at)} IST — {e.by}: {e.action}
                {e.detail ? ` — ${e.detail}` : ''}
              </p>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-[#64748B]">
            Operator identity: {OPERATOR_LABEL}. History is stored in this browser only.
          </p>
          {zone?.prediction ? (
            <p className="mt-2">
              <LevelBadge level={zone.prediction.level} />
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
