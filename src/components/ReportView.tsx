import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { CheckCircle2, MapPin, ShieldAlert, TriangleAlert } from 'lucide-react'
import { formatDateTimeIST } from './risk'
import {
  REPORT_CATEGORIES,
  REPORT_STATUS_LABELS,
  addReportNote,
  getReportStatus,
  loadReports,
  makeReportId,
  nearestZone,
  nextReportStatuses,
  saveReports,
  transitionReportStatus,
  validatePhoto,
  validateReport,
  type HazardReport,
  type PhotoMeta,
  type ReportStatus,
} from '../services/reports'
import type { ZoneWithScore } from './types'

interface ReportViewProps {
  onReportSubmitted?: (report: HazardReport) => void
  /** Live zones for nearest-zone risk lookup (§10.5). Optional — UI degrades honestly. */
  zones?: ZoneWithScore[]
}

const inputClass =
  'w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2.5 text-[16px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#106EBE] focus:ring-[#106EBE]/30 focus:outline-none md:text-[14px]'
const labelClass = 'mb-1.5 block text-[14px] font-medium text-[#0F172A]'
const errClass = 'mt-1 text-[13px] text-[#B91C1C]'
const warnClass = 'mt-1 text-[13px] text-[#B45309]'

function riskForZone(zones: ZoneWithScore[] | undefined, zoneId: string | null): string {
  if (!zoneId) return 'No zone matched'
  const zone = zones?.find((z) => z.location.id === zoneId)
  if (!zone) return 'Zone lookup unavailable'
  if (zone.prediction) return `${zone.prediction.level} (score ${Math.round(zone.prediction.score)})`
  return 'Unknown — no live data'
}

/**
 * Hazard reporting: mobile-first form, confirmation screen, review workflow.
 *
 * Honesty contract:
 * - Reports live in this browser only (localStorage). Photos are never
 *   uploaded — only metadata + a session preview on this device.
 * - Status after submit is "Submitted — pending verification", never
 *   "confirmed incident". Proximity to a monitored zone is context, not proof.
 * - Review buttons are available to the control-room operator.
 */
export default function ReportView({ onReportSubmitted, zones }: ReportViewProps) {
  const isOperator = true
  const [reports, setReports] = useState<HazardReport[]>([])
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [photoMeta, setPhotoMeta] = useState<PhotoMeta | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [warnings, setWarnings] = useState<Record<string, string>>({})
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<HazardReport | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [transitionError, setTransitionError] = useState<string | null>(null)
  const confirmationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReports(loadReports())
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const operatorName = 'Operator (this device)'

  const handlePhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setPhotoError(null)
    if (!file) {
      setPhotoMeta(null)
      if (photoUrl) URL.revokeObjectURL(photoUrl)
      setPhotoUrl(null)
      return
    }
    const { ok, error } = validatePhoto(file)
    if (!ok) {
      setPhotoError(error ?? 'Photo rejected.')
      setFileInputKey((k) => k + 1)
      return
    }
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    const url = URL.createObjectURL(file)
    setPhotoUrl(url)
    setPhotoMeta({
      name: file.name,
      sizeBytes: file.size,
      mime: file.type || 'image/*',
      note: 'Kept on this device only — never uploaded to a server.',
    })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const { ok, errors: errs, warnings: warns } = validateReport({
      location,
      category,
      description,
      lat,
      lng,
      consent,
    })
    setErrors(errs)
    setWarnings(warns)
    if (!ok) return

    const latNum = lat.trim() === '' ? null : Number(lat)
    const lngNum = lng.trim() === '' ? null : Number(lng)
    const near = latNum != null && lngNum != null ? nearestZone(latNum, lngNum) : null
    const now = new Date().toISOString()
    const report: HazardReport = {
      id: makeReportId(),
      location: location.trim(),
      type: category,
      description: description.trim(),
      photoName: photoMeta?.name ?? null,
      photoMeta,
      lat: latNum,
      lng: lngNum,
      nearestZoneId: near?.zone.id ?? null,
      nearestZoneName: near?.zone.name ?? null,
      nearestZoneKm: near ? Math.round(near.distanceKm * 10) / 10 : null,
      status: 'submitted',
      history: [
        {
          at: now,
          by: 'Citizen (this device)',
          action: 'Report submitted',
          detail: 'Status: Submitted — pending verification',
        },
      ],
      consentAt: now,
      time: now,
    }
    const next = [report, ...reports]
    setReports(next)
    saveReports(next)
    onReportSubmitted?.(report)
    // Reset form
    setLocation('')
    setCategory('')
    setDescription('')
    setLat('')
    setLng('')
    setPhotoMeta(null)
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    setPhotoUrl(null)
    setConsent(false)
    setErrors({})
    setWarnings({})
    setPhotoError(null)
    setFileInputKey((k) => k + 1)
    setConfirmation(report)
    window.setTimeout(
      () => confirmationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      50,
    )
  }

  const doTransition = (id: string, next: ReportStatus, note?: string) => {
    setTransitionError(null)
    const res = transitionReportStatus(id, next, operatorName, note)
    if (!res.ok) {
      setTransitionError(res.error ?? 'Transition failed.')
      return
    }
    setReports(loadReports())
  }

  const doAddNote = (id: string) => {
    if (!noteText.trim()) return
    addReportNote(id, operatorName, noteText)
    setNoteText('')
    setReports(loadReports())
  }

  /* ------------------------------ render ------------------------------ */

  if (confirmation) {
    const near = confirmation.nearestZoneId
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div
          ref={confirmationRef}
          className="rounded-[15px] border border-[#34D399]/40 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]"
        >
          <p className="flex items-center gap-2 text-[20px] font-bold text-[#0F172A]">
            <CheckCircle2 className="h-6 w-6 text-[#34D399]" aria-hidden="true" />
            Report received
          </p>
          <p className="mt-2 text-[15px] text-[#0F172A]">
            Status:{' '}
            <span className="font-bold text-[#FBBF24]">
              {REPORT_STATUS_LABELS[confirmation.status]}
            </span>
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-[#64748B]">
            Your report is <strong className="text-[#0F172A]">not a confirmed incident</strong> — a
            control-room operator must review it first. Proximity to a monitored zone does not
            verify it.
          </p>
          <div className="mt-4 divide-y divide-[#D9D9D9] rounded-xl border border-[#D9D9D9] px-4">
            <ConfirmRow label="Report ID" value={<span className="font-mono">{confirmation.id}</span>} />
            <ConfirmRow label="What you saw" value={confirmation.type} />
            <ConfirmRow label="Location" value={confirmation.location} />
            {near ? (
              <ConfirmRow
                label="Nearest monitored zone"
                value={`${confirmation.nearestZoneName} · ${confirmation.nearestZoneKm} km away`}
              />
            ) : (
              <ConfirmRow label="Nearest monitored zone" value="No coordinates given — no zone matched" />
            )}
            {near ? (
              <ConfirmRow
                label="Zone's latest risk"
                value={riskForZone(zones, confirmation.nearestZoneId)}
              />
            ) : null}
            {confirmation.photoMeta ? (
              <ConfirmRow
                label="Photo"
                value={`${confirmation.photoMeta.name} (${(confirmation.photoMeta.sizeBytes / 1024).toFixed(0)} KB) — kept on this device only, not uploaded`}
              />
            ) : null}
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-[#64748B]">
            What happens next: the report stays in this browser's review queue with the status
            above. A control-room operator can move it
            to Under Review → Verified → Assigned as the field situation is checked.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setConfirmation(null)}
              className="rounded-full bg-[#106EBE] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#004F88] active:scale-[0.97]"
            >
              View my reports
            </button>
            <button
              type="button"
              onClick={() => setConfirmation(null)}
              className="rounded-full border border-[#D9D9D9] bg-white px-5 py-2.5 text-[14px] font-medium text-[#0F172A] hover:bg-[#E9E9E9] active:scale-[0.97]"
            >
              Submit another report
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-[15px] border border-[#003A66] bg-[#004F88] bg-cover bg-center"
        style={{
          backgroundImage: `url("https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Road_construction_causing_landslides_in_the_Himalaya%2C_AJTJ.jpg/1920px-Road_construction_causing_landslides_in_the_Himalaya%2C_AJTJ.jpg")`,
        }}
      >
        <div
          className="absolute inset-0 bg-[linear-gradient(100deg,rgba(0,79,136,0.93)_30%,rgba(0,79,136,0.55)_65%,rgba(0,79,136,0.25))]"
          aria-hidden="true"
        />
        <div className="relative z-10 p-5">
          <p className="text-[18px] font-bold text-white">See something on a slope? Report it.</p>
          <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-white/85">
            Fresh cracks, tilted trees, muddy seepage — your field report helps verify what the
            model flags. Reports start as <strong>Submitted — pending verification</strong>, never as
            confirmed landslides.
          </p>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-5">
        <div className="flex flex-col gap-5 lg:col-span-3">
      {/* Form */}
      <div className="rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
        <p className="mb-1 text-[20px] font-bold text-[#0F172A]">Report a Hazard</p>
        <p className="mb-5 text-[14px] leading-relaxed text-[#64748B]">
          Saved in this browser only (localStorage) — nothing is sent to a server. Every report
          starts as <span className="font-medium text-[#FBBF24]">Submitted — pending verification</span>{' '}
          and is never auto-verified as a real landslide.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="report-category" className={labelClass}>
              What did you see? *
            </label>
            <select
              id="report-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              <option value="">— Select what you saw —</option>
              {REPORT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[13px] text-[#64748B]">
              This is what you observed — it is recorded as unverified.
            </p>
            {errors.category ? <p className={errClass}>{errors.category}</p> : null}
          </div>

          <div>
            <label htmlFor="report-location" className={labelClass}>
              Location *
            </label>
            <input
              id="report-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. NH-10, near Gangtok"
              autoComplete="off"
              className={inputClass}
            />
            {errors.location ? <p className={errClass}>{errors.location}</p> : null}
          </div>

          <div>
            <label htmlFor="report-description" className={labelClass}>
              Description *
            </label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you see, when, what is the road condition…"
              rows={4}
              className={inputClass}
            />
            {errors.description ? <p className={errClass}>{errors.description}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="report-lat" className={labelClass}>
                Latitude <span className="font-normal text-[#64748B]">(optional)</span>
              </label>
              <input
                id="report-lat"
                type="text"
                inputMode="decimal"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="27.33"
                autoComplete="off"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="report-lng" className={labelClass}>
                Longitude <span className="font-normal text-[#64748B]">(optional)</span>
              </label>
              <input
                id="report-lng"
                type="text"
                inputMode="decimal"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="88.61"
                autoComplete="off"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => {
                if (!navigator.geolocation) return
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setLat(pos.coords.latitude.toFixed(5))
                    setLng(pos.coords.longitude.toFixed(5))
                  },
                  () => {},
                  { timeout: 8000 },
                )
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9D9D9] bg-white px-3 py-2 text-[14px] text-[#0F172A] hover:bg-[#E9E9E9] active:scale-[0.97]"
            >
              <MapPin className="h-4 w-4 text-[#106EBE]" aria-hidden="true" />
              Use my location
            </button>
            {errors.coords ? <p className={errClass}>{errors.coords}</p> : null}
            {warnings.coords ? <p className={warnClass}>{warnings.coords}</p> : null}
          </div>

          <div>
            <label htmlFor="report-photo" className={labelClass}>
              Photo <span className="font-normal text-[#64748B]">(optional, max 5 MB)</span>
            </label>
            <input
              id="report-photo"
              key={fileInputKey}
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[14px] text-[#0F172A]"
            />
            {photoError ? <p className={errClass}>{photoError}</p> : null}
            {photoMeta && !photoError ? (
              <div className="mt-2 flex items-start gap-3">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Selected report photo preview"
                    className="h-16 w-16 shrink-0 rounded-lg border border-[#D9D9D9] object-cover"
                  />
                ) : null}
                <p className="text-[13px] leading-relaxed text-[#64748B]">
                  {photoMeta.name} ({(photoMeta.sizeBytes / 1024).toFixed(0)} KB) — {photoMeta.note}
                </p>
              </div>
            ) : null}
            {!photoMeta && !photoError ? (
              <p className="mt-1 text-[13px] text-[#64748B]">
                If attached, only the file name and a session preview are kept — the photo is not
                uploaded anywhere.
              </p>
            ) : null}
          </div>

          <label
            htmlFor="report-consent"
            className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#D9D9D9] bg-[#F0F0F0] p-3"
          >
            <input
              id="report-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[#106EBE]"
            />
            <span className="text-[14px] leading-relaxed text-[#475569]">
              I understand this report is stored <strong>in this browser only</strong>, is not sent
              to any server, and will be treated as{' '}
              <strong>unverified</strong> until a control-room operator reviews it.
            </span>
          </label>
          {errors.consent ? <p className={errClass}>{errors.consent}</p> : null}

          <div>
            <button
              type="submit"
              className="w-full rounded-full bg-[#106EBE] px-5 py-3 text-[15px] font-semibold text-white hover:bg-[#004F88] active:scale-[0.98] sm:w-auto sm:px-8"
            >
              Submit Report
            </button>
          </div>
        </form>
      </div>

        </div>
        <div className="flex flex-col gap-5 lg:col-span-2">
      {/* Safety panel (§15 — plain language) */}
      <div className="rounded-[15px] border border-[#FBBF24]/40 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
        <p className="flex items-center gap-2 text-[16px] font-bold text-[#0F172A]">
          <ShieldAlert className="h-5 w-5 text-[#FBBF24]" aria-hidden="true" />
          Stay safe first
        </p>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-relaxed text-[#475569]">
          <li>If you are near a failing slope, move away from it before doing anything else.</li>
          <li>
            No active alert <strong>does not mean you are safe</strong> — slopes can fail without
            warning, and lack of alerts does not guarantee safety.
          </li>
          <li>Do not cross debris or blocked roads to take a photo. No photo is worth the risk.</li>
        </ul>
        <p className="mt-3 text-[14px] text-[#64748B]">
          Emergency numbers (real public helplines, India — free to call):{' '}
          <strong className="text-[#0F172A]">112</strong> (all emergencies) ·{' '}
          <strong className="text-[#0F172A]">108</strong> (ambulance) ·{' '}
          <strong className="text-[#0F172A]">1077</strong> (disaster management helpline)
        </p>
      </div>
      {/* My reports */}
      <div className="rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
        <p className="mb-1 text-[18px] font-bold text-[#0F172A]">Your Reports</p>
        <p className="mb-4 text-[13px] leading-relaxed text-[#64748B]">
          Reports from this browser. Review them below as the control-room operator.
        </p>
        {transitionError ? (
          <p className="mb-3 rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 p-3 text-[14px] text-[#B91C1C]">
            {transitionError}
          </p>
        ) : null}
        {reports.length === 0 ? (
          <p className="text-[14px] text-[#64748B]">No reports yet.</p>
        ) : (
          <div className="flex flex-col">
            {reports.map((report) => {
              const status = getReportStatus(report)
              const nexts = nextReportStatuses(status)
              const expanded = expandedId === report.id
              return (
                <div
                  key={report.id}
                  className="border-b border-[#D9D9D9] py-4 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span
                      className="max-w-full truncate text-[15px] font-medium text-[#0F172A]"
                      title={report.location}
                    >
                      {report.location}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-[#D9D9D9] bg-[#E9E9E9] px-2 py-0.5 text-[12px] font-medium whitespace-nowrap text-[#0F172A]">
                      {report.type}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap ${
                        status === 'submitted'
                          ? 'bg-[#FBBF24]/12 text-[#B45309]'
                          : status === 'verified' || status === 'resolved'
                            ? 'bg-[#34D399]/12 text-[#047857]'
                            : status === 'rejected' || status === 'duplicate' || status === 'unable_to_verify'
                              ? 'bg-[#94A3B8]/15 text-[#64748B]'
                              : 'bg-[#106EBE]/10 text-[#004F88]'
                      }`}
                    >
                      {REPORT_STATUS_LABELS[status]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#64748B] line-clamp-2">
                    {report.description}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-[#64748B]">
                    <span className="font-mono">{report.id}</span>
                    <span>{formatDateTimeIST(report.time)} IST</span>
                    {report.nearestZoneName ? (
                      <span>
                        Nearest zone: {report.nearestZoneName} · {report.nearestZoneKm} km ·{' '}
                        {riskForZone(zones, report.nearestZoneId)}
                      </span>
                    ) : null}
                  </p>
                  {report.photoMeta ? (
                    <p className="mt-1 truncate text-[13px] text-[#64748B]" title={report.photoMeta.name}>
                      Photo: {report.photoMeta.name} (this device only)
                    </p>
                  ) : null}

                  {isOperator && nexts.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <TriangleAlert
                        className="h-3.5 w-3.5 text-[#FBBF24]"
                        aria-hidden="true"
                      />
                      {nexts.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => doTransition(report.id, s)}
                          className="rounded-lg border border-[#D9D9D9] bg-white px-2.5 py-1.5 text-[13px] text-[#0F172A] hover:bg-[#E9E9E9] active:scale-[0.97]"
                        >
                          {REPORT_STATUS_LABELS[s].replace(/^Submitted — /, '')}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      setExpandedId(expanded ? null : report.id)
                      setNoteText('')
                    }}
                    aria-expanded={expanded}
                    className="mt-2 text-[13px] font-medium text-[#106EBE] hover:underline"
                  >
                    {expanded ? 'Hide history' : 'History & notes'} ({report.history.length})
                  </button>
                  {expanded ? (
                    <div className="mt-2 rounded-lg border border-[#D9D9D9] bg-[#F0F0F0] p-3">
                      <div className="flex flex-col gap-1.5">
                        {report.history.length === 0 ? (
                          <p className="text-[13px] text-[#64748B]">No history yet.</p>
                        ) : (
                          report.history.map((h, i) => (
                            <p key={i} className="text-[13px] leading-relaxed text-[#64748B]">
                              <span className="text-[#0F172A]">{h.action}</span> — {h.by} ·{' '}
                              {formatDateTimeIST(h.at)} IST
                              {h.detail ? <span className="block pl-1 text-[#475569]">{h.detail}</span> : null}
                            </p>
                          ))
                        )}
                      </div>
                      {isOperator ? (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && doAddNote(report.id)}
                            placeholder="Add a review note…"
                            aria-label="Add review note"
                            className="flex-1 rounded-lg border border-[#D9D9D9] bg-white px-3 py-2 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#106EBE] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => doAddNote(report.id)}
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
      </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="shrink-0 text-[13px] text-[#64748B]">{label}</span>
      <span className="text-[14px] font-medium break-words text-[#0F172A] sm:text-right">{value}</span>
    </div>
  )
}
