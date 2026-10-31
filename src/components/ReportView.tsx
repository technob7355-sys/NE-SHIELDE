import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { formatDateTimeIST } from './risk'
import {
  loadReports,
  saveReports,
  validateReport,
  type HazardReport,
} from '../services/reports'
import { LIFECYCLE_LABELS, getStatus } from '../services/alertStore'

interface ReportViewProps {
  onReportSubmitted?: (report: HazardReport) => void
}

export default function ReportView({ onReportSubmitted }: ReportViewProps) {
  const [reports, setReports] = useState<HazardReport[]>([])
  const [location, setLocation] = useState('')
  const [type, setType] = useState('Landslide')
  const [description, setDescription] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [justSubmitted, setJustSubmitted] = useState(false)

  useEffect(() => {
    setReports(loadReports())
  }, [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const { ok, errors: errs } = validateReport({ location, description, lat, lng })
    setErrors(errs)
    if (!ok) return
    const report: HazardReport = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      location: location.trim(),
      type,
      description: description.trim(),
      photoName,
      lat: lat.trim() === '' ? null : Number(lat),
      lng: lng.trim() === '' ? null : Number(lng),
      time: new Date().toISOString(),
    }
    const next = [report, ...reports]
    setReports(next)
    saveReports(next)
    onReportSubmitted?.(report)
    setLocation('')
    setType('Landslide')
    setDescription('')
    setLat('')
    setLng('')
    setPhotoName(null)
    setErrors({})
    setFileInputKey((k) => k + 1)
    setJustSubmitted(true)
    window.setTimeout(() => setJustSubmitted(false), 6000)
  }

  const inputClass =
    'w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#106EBE] focus:ring-[#106EBE]/30 focus:outline-none'
  const errClass = 'mt-1 text-[13px] text-[#F87171]'

  return (
    <div className="flex flex-col gap-5">
      {/* Subtle image accent — hillside landslide photo */}
      <div
        className="relative overflow-hidden rounded-[15px] border border-[#003A66] bg-[#004F88] bg-cover bg-center"
        style={{ backgroundImage: `url("https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Road_construction_causing_landslides_in_the_Himalaya%2C_AJTJ.jpg/1920px-Road_construction_causing_landslides_in_the_Himalaya%2C_AJTJ.jpg")` }}
      >
        <div
          className="absolute inset-0 bg-[linear-gradient(100deg,rgba(0,79,136,0.93)_30%,rgba(0,79,136,0.55)_65%,rgba(0,79,136,0.25))]"
          aria-hidden="true"
        />
        <div className="relative z-10 p-5">
          <p className="text-[18px] font-bold text-white">See something on a slope? Report it.</p>
          <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-white/85">
            Fresh cracks, tilted trees, muddy seepage — your field report helps verify what the
            model flags.
          </p>
        </div>
      </div>
      <div className="rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
        <p className="mb-1 text-[22px] font-bold text-[#0F172A]">Report a Hazard</p>
        <p className="mb-5 text-[14px] leading-relaxed text-[#64748B]">
          Reports are saved in this browser only (localStorage) — nothing is sent to a server.
          Every report starts as <span className="text-[#FBBF24]">Pending Verification</span> and is
          never auto-verified as a real landslide.
        </p>
        {justSubmitted ? (
          <p className="mb-4 rounded-lg border border-[#004F88]/30 bg-[#004F88]/10 p-3 text-[14px] text-[#004F88]">
            Report submitted — status: Pending Verification. Review it under Alerts → Hazard Report
            Review.
          </p>
        ) : null}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="report-location" className="mb-1.5 block text-[14px] text-[#64748B]">
              Location *
            </label>
            <input
              id="report-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. NH-10, near Gangtok"
              className={inputClass}
            />
            {errors.location ? <p className={errClass}>{errors.location}</p> : null}
          </div>
          <div>
            <label htmlFor="report-type" className="mb-1.5 block text-[14px] text-[#64748B]">
              Hazard type
            </label>
            <select
              id="report-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputClass}
            >
              <option value="Landslide">Landslide</option>
              <option value="Crack">Crack</option>
              <option value="Rockfall">Rockfall</option>
              <option value="Flood">Flood</option>
              <option value="Road Blockage">Road Blockage</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="report-description" className="mb-1.5 block text-[14px] text-[#64748B]">
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="report-lat" className="mb-1.5 block text-[14px] text-[#64748B]">
                Latitude (optional)
              </label>
              <input
                id="report-lat"
                type="text"
                inputMode="decimal"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="27.33"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="report-lng" className="mb-1.5 block text-[14px] text-[#64748B]">
                Longitude (optional)
              </label>
              <input
                id="report-lng"
                type="text"
                inputMode="decimal"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="88.61"
                className={inputClass}
              />
            </div>
          </div>
          {errors.coords ? <p className={errClass}>{errors.coords}</p> : null}
          <div>
            <label htmlFor="report-photo" className="mb-1.5 block text-[14px] text-[#64748B]">
              Photo (optional)
            </label>
            <input
              id="report-photo"
              key={fileInputKey}
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-[14px] text-[#0F172A]"
            />
            {photoName ? (
              <p className="mt-1.5 truncate text-[13px] text-[#64748B]" title={photoName}>Selected: {photoName}</p>
            ) : null}
            <p className="mt-1 text-[14px] text-[#64748B]">
              Only the file name is saved — the photo is not uploaded anywhere.
            </p>
          </div>
          <div>
            <button
              type="submit"
              className="rounded-full bg-[#106EBE] px-5 py-2 text-[14px] font-medium text-white hover:bg-[#004F88]"
            >
              Submit Report
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
        <p className="mb-4 text-[18px] font-bold text-[#0F172A]">Your Reports</p>
        {reports.length === 0 ? (
          <p className="text-[14px] text-[#64748B]">No reports yet.</p>
        ) : (
          <div className="flex flex-col">
            {reports.map((report) => (
              <div
                key={report.id}
                className="border-b border-[#D9D9D9] py-4 first:pt-0 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="max-w-full truncate text-[15px] font-medium text-[#0F172A]" title={report.location}>
                    {report.location}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[#D9D9D9] bg-[#E9E9E9] px-2 py-0.5 text-[12px] font-medium whitespace-nowrap text-[#0F172A]">
                    {report.type}
                  </span>
                  <span className="rounded-full bg-[#FBBF24]/12 px-2 py-0.5 text-[12px] font-medium text-[#FBBF24]">
                    {LIFECYCLE_LABELS[getStatus(report.id)]}
                  </span>
                  <span className="text-[13px] whitespace-nowrap text-[#64748B]">
                    {formatDateTimeIST(report.time)} IST
                  </span>
                </div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#64748B] line-clamp-2">
                  {report.description}
                </p>
                {report.photoName ? (
                  <p className="mt-1 truncate text-[13px] text-[#64748B]" title={report.photoName}>Photo: {report.photoName}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
