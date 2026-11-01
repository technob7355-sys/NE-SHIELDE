import { useMemo, useState } from 'react'
import { FileWarning } from 'lucide-react'
import type { Alert } from '../services/alerts'
import type { ZoneWithScore } from './types'
import { formatDateTimeIST } from './risk'
import {
  INCIDENT_FLOW,
  INCIDENT_STATUS_LABELS,
  addIncidentNote,
  assignIncident,
  createIncident,
  incidentExistsFor,
  loadIncidents,
  transitionIncident,
  type Incident,
  type IncidentSource,
  type IncidentStatus,
} from '../services/incidents'
import { getReportStatus, loadReports } from '../services/reports'
import { canManageIncidents, canSeeIncidents, canWorkIncidents, useRole } from '../services/roles'

interface IncidentsProps {
  alerts: Alert[]
  zones: ZoneWithScore[]
}

const STATUS_STYLE: Record<IncidentStatus, string> = {
  open: 'bg-[#FBBF24]/12 text-[#B45309]',
  assigned: 'bg-[#106EBE]/10 text-[#004F88]',
  in_progress: 'bg-[#A78BFA]/15 text-[#7C3AED]',
  resolved: 'bg-[#34D399]/12 text-[#047857]',
  closed: 'bg-[#94A3B8]/15 text-[#64748B]',
}

/**
 * Compact incident-tracking section rendered inside the Alerts tab.
 *
 * Real localStorage-backed workflow: create from a model alert or a VERIFIED
 * report, free-text officer assignment, status transitions, notes, and a
 * timestamped audit trail. Per-browser only — no server, no dispatch sync.
 * Hidden entirely for the Citizen demo role.
 */
export default function Incidents({ alerts, zones }: IncidentsProps) {
  const role = useRole()
  const visible = canSeeIncidents(role)
  const canWork = canWorkIncidents(role)
  const canManage = canManageIncidents(role)
  const [incidents, setIncidents] = useState<Incident[]>(() => loadIncidents())
  const [sourceKind, setSourceKind] = useState<'alert' | 'report'>('alert')
  const [sourceId, setSourceId] = useState('')
  const [assignee, setAssignee] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [assigneeEdit, setAssigneeEdit] = useState<Record<string, string>>({})

  const verifiedReports = useMemo(
    () => loadReports().filter((r) => getReportStatus(r) === 'verified'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [incidents],
  )

  const sourceOptions = useMemo(() => {
    if (sourceKind === 'alert') {
      return alerts.map((a) => ({
        id: a.id,
        label: `${a.severity}: ${a.title}`,
        source: { kind: 'alert', id: a.id, label: a.title } as IncidentSource,
        zoneId: a.zoneId,
        zoneName: a.zoneName,
      }))
    }
    return verifiedReports.map((r) => ({
      id: r.id,
      label: `${r.type} — ${r.location}`,
      source: {
        kind: 'report',
        id: r.id,
        label: `${r.type} reported near ${r.location}`,
      } as IncidentSource,
      zoneId: r.nearestZoneId,
      zoneName: r.nearestZoneName,
    }))
  }, [sourceKind, alerts, verifiedReports])

  if (!visible) return null

  const refresh = () => setIncidents(loadIncidents())

  const handleCreate = () => {
    setError(null)
    const opt = sourceOptions.find((o) => o.id === sourceId)
    if (!opt) {
      setError('Pick an alert or a verified report to create the incident from.')
      return
    }
    if (incidentExistsFor(opt.id)) {
      setError('An incident already exists for this source — open it below instead.')
      return
    }
    const res = createIncident('Field/Operator (this device)', {
      title: opt.label,
      source: opt.source,
      zoneId: opt.zoneId,
      zoneName: opt.zoneName,
      assignee,
    })
    if (!res.ok) {
      setError(res.error ?? 'Could not create incident.')
      return
    }
    setAssignee('')
    setSourceId('')
    refresh()
  }

  const handleAssign = (id: string) => {
    const res = assignIncident(id, 'Operator (this device)', assigneeEdit[id] ?? '')
    if (!res.ok) setError(res.error ?? 'Assign failed.')
    else {
      setAssigneeEdit((m) => ({ ...m, [id]: '' }))
      refresh()
    }
  }

  const handleTransition = (id: string, next: IncidentStatus) => {
    const res = transitionIncident(id, next, 'Operator (this device)')
    if (!res.ok) setError(res.error ?? 'Transition failed.')
    else refresh()
  }

  const handleNote = (id: string) => {
    const res = addIncidentNote(id, `${role === 'field' ? 'Field Officer' : 'Operator'} (this device)`, noteText)
    if (!res.ok) setError(res.error ?? 'Note failed.')
    else {
      setNoteText('')
      refresh()
    }
  }

  const zoneName = (zoneId: string | null): string => {
    if (!zoneId) return '—'
    return zones.find((z) => z.location.id === zoneId)?.location.name ?? zoneId
  }

  return (
    <div className="flex flex-col rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
      <div className="mb-1 flex items-center gap-2">
        <FileWarning className="h-4 w-4 text-[#FB923C]" aria-hidden="true" />
        <p className="text-[18px] font-bold text-[#0F172A]">Incidents — response tracking</p>
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-[#64748B]">
        Created from model alerts or <strong>verified</strong> reports only. Stored in this browser
        only — no server dispatch, no cross-device sync.
      </p>

      {error ? (
        <p className="mb-3 rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 p-3 text-[14px] text-[#B91C1C]">
          {error}
        </p>
      ) : null}

      {canWork ? (
        <div className="mb-5 rounded-xl border border-[#D9D9D9] bg-[#F0F0F0] p-4">
          <p className="mb-2 text-[14px] font-bold text-[#0F172A]">New incident</p>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="incident-source-kind" className="mb-1 block text-[13px] text-[#64748B]">
                From
              </label>
              <select
                id="incident-source-kind"
                value={sourceKind}
                onChange={(e) => {
                  setSourceKind(e.target.value as 'alert' | 'report')
                  setSourceId('')
                }}
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[14px] text-[#0F172A] focus:border-[#106EBE] focus:outline-none"
              >
                <option value="alert">Model alert ({alerts.length})</option>
                <option value="report">Verified report ({verifiedReports.length})</option>
              </select>
            </div>
            <div className="flex-[2]">
              <label htmlFor="incident-source" className="mb-1 block text-[13px] text-[#64748B]">
                {sourceKind === 'alert' ? 'Alert' : 'Verified report'}
              </label>
              <select
                id="incident-source"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[14px] text-[#0F172A] focus:border-[#106EBE] focus:outline-none"
              >
                <option value="">— select —</option>
                {sourceOptions.map((o) => (
                  <option key={o.id} value={o.id} disabled={incidentExistsFor(o.id)}>
                    {o.label}
                    {incidentExistsFor(o.id) ? ' (incident exists)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="incident-assignee" className="mb-1 block text-[13px] text-[#64748B]">
                Assign officer <span className="text-[#94A3B8]">(optional)</span>
              </label>
              <input
                id="incident-assignee"
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="e.g. D. Bhutia"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#106EBE] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleCreate}
              className="shrink-0 rounded-full bg-[#106EBE] px-5 py-2 text-[14px] font-medium text-white hover:bg-[#004F88] active:scale-[0.97]"
            >
              Create incident
            </button>
          </div>
          {sourceKind === 'report' && verifiedReports.length === 0 ? (
            <p className="mt-2 text-[13px] text-[#64748B]">
              No verified reports yet — reports become incidents only after operator verification.
            </p>
          ) : null}
        </div>
      ) : null}

      {incidents.length === 0 ? (
        <p className="text-[14px] text-[#64748B]">
          No incidents yet. Create one from an alert or a verified report above.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {incidents.map((incident) => {
            const nexts = INCIDENT_FLOW[incident.status]
            const expanded = expandedId === incident.id
            return (
              <div
                key={incident.id}
                className="rounded-lg border border-[#D9D9D9] bg-[#F0F0F0] p-3"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-[13px] text-[#64748B]">{incident.id}</span>
                  <span className="min-w-0 flex-1 text-[15px] font-medium break-words text-[#0F172A]">
                    {incident.title}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap ${STATUS_STYLE[incident.status]}`}
                  >
                    {INCIDENT_STATUS_LABELS[incident.status]}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-[#64748B]">
                  From {incident.source.kind === 'alert' ? 'alert' : 'verified report'} · Zone:{' '}
                  {incident.zoneName ?? zoneName(incident.zoneId)} · Officer:{' '}
                  <strong className="text-[#0F172A]">
                    {incident.assignee || 'unassigned'}
                  </strong>{' '}
                  · Created {formatDateTimeIST(incident.createdAt)} IST
                </p>

                {canManage ? (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {nexts.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleTransition(incident.id, s)}
                        className="rounded-lg border border-[#D9D9D9] bg-white px-2.5 py-1.5 text-[13px] text-[#0F172A] hover:bg-[#E9E9E9] active:scale-[0.97]"
                      >
                        → {INCIDENT_STATUS_LABELS[s]}
                      </button>
                    ))}
                    <div className="ml-1 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={assigneeEdit[incident.id] ?? ''}
                        onChange={(e) =>
                          setAssigneeEdit((m) => ({ ...m, [incident.id]: e.target.value }))
                        }
                        placeholder="Officer name"
                        aria-label={`Assign officer for ${incident.id}`}
                        className="w-36 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#106EBE] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAssign(incident.id)}
                        className="rounded-lg bg-[#106EBE] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#004F88] active:scale-[0.97]"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setExpandedId(expanded ? null : incident.id)
                    setNoteText('')
                  }}
                  aria-expanded={expanded}
                  className="mt-2 text-[13px] font-medium text-[#106EBE] hover:underline"
                >
                  {expanded ? 'Hide audit trail' : 'Audit trail'} ({incident.audit.length})
                  {incident.notes.length > 0 ? ` · Notes (${incident.notes.length})` : ''}
                </button>

                {expanded ? (
                  <div className="mt-2 rounded-lg border border-[#D9D9D9] bg-white p-3">
                    {incident.notes.map((n, i) => (
                      <p key={`n-${i}`} className="mb-1.5 text-[13px] leading-relaxed text-[#0F172A]">
                        <span className="font-medium">Note:</span> {n.text}
                        <span className="block text-[#64748B]">
                          {n.by} · {formatDateTimeIST(n.at)} IST
                        </span>
                      </p>
                    ))}
                    {incident.audit.map((a, i) => (
                      <p key={`a-${i}`} className="text-[13px] leading-relaxed text-[#64748B]">
                        {formatDateTimeIST(a.at)} IST — {a.by}: {a.action}
                        {a.detail ? ` — ${a.detail}` : ''}
                      </p>
                    ))}
                    {canWork ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleNote(incident.id)}
                          placeholder="Add a field note…"
                          aria-label="Add incident note"
                          className="flex-1 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#106EBE] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleNote(incident.id)}
                          className="shrink-0 rounded-full bg-[#106EBE] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#004F88] active:scale-[0.97]"
                        >
                          Add
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
      <p className="mt-3 text-[13px] leading-relaxed text-[#64748B]">
        Incident history is stored in this browser only and labeled as such. For the production
        incident pipeline see docs/backend-notifications-spec.md.
      </p>
    </div>
  )
}
