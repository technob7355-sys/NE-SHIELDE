import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { formatDateTimeIST } from './risk'

const STORAGE_KEY = 'neshield_reports_v4'

interface HazardReport {
  id: string
  location: string
  type: string
  description: string
  photoName: string | null
  time: string
}

function loadReports(): HazardReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HazardReport[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function ReportView() {
  const [reports, setReports] = useState<HazardReport[]>([])
  const [location, setLocation] = useState('')
  const [type, setType] = useState('Landslide')
  const [description, setDescription] = useState('')
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)

  useEffect(() => {
    setReports(loadReports())
  }, [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const report: HazardReport = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      location: location.trim(),
      type,
      description: description.trim(),
      photoName,
      time: new Date().toISOString(),
    }
    const next = [report, ...reports]
    setReports(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // storage full / unavailable — list still shows in this session
    }
    setLocation('')
    setType('Landslide')
    setDescription('')
    setPhotoName(null)
    setFileInputKey((k) => k + 1)
  }

  const inputClass =
    'w-full rounded-lg border border-(--border) bg-(--surface-2) px-3 py-2 text-[14px] text-(--text) placeholder:text-(--muted) focus:border-(--accent) focus:outline-none'

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
        <p className="mb-1 text-[20px] font-bold text-(--text)">Report a Hazard</p>
        <p className="mb-5 text-[13px] leading-relaxed text-(--muted)">
          Demo: reports sirf isi browser me save hoti hain (localStorage) — koi server par nahi
          jaati.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="report-location" className="mb-1.5 block text-[13px] text-(--muted)">
              Location
            </label>
            <input
              id="report-location"
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. NH-10, near Gangtok"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="report-type" className="mb-1.5 block text-[13px] text-(--muted)">
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
            <label htmlFor="report-description" className="mb-1.5 block text-[13px] text-(--muted)">
              Description
            </label>
            <textarea
              id="report-description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kya dekha, kab dekha, road ki haalat kya hai…"
              rows={4}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="report-photo" className="mb-1.5 block text-[13px] text-(--muted)">
              Photo (optional)
            </label>
            <input
              id="report-photo"
              key={fileInputKey}
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
              className="w-full rounded-lg border border-(--border) bg-(--surface-2) px-3 py-2 text-[14px] text-(--text)"
            />
            {photoName ? (
              <p className="mt-1.5 truncate text-[12px] text-(--muted)">Selected: {photoName}</p>
            ) : null}
            <p className="mt-1 text-[12px] text-(--muted)">
              Sirf file ka naam save hota hai — photo upload nahi hoti.
            </p>
          </div>
          <div>
            <button
              type="submit"
              className="rounded-lg bg-(--accent) px-4 py-2 text-[14px] font-medium text-white"
            >
              Submit Report
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
        <p className="mb-4 text-[16px] font-bold text-(--text)">Your Reports</p>
        {reports.length === 0 ? (
          <p className="text-[14px] text-(--muted)">Abhi koi report nahi hai.</p>
        ) : (
          <div className="flex flex-col">
            {reports.map((report) => (
              <div
                key={report.id}
                className="border-b border-(--border) py-4 first:pt-0 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="max-w-full truncate text-[14px] font-medium text-(--text)">
                    {report.location}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-(--border) bg-(--surface-2) px-2 py-0.5 text-[12px] font-medium whitespace-nowrap text-(--text)">
                    {report.type}
                  </span>
                  <span className="text-[12px] whitespace-nowrap text-(--muted)">
                    {formatDateTimeIST(report.time)} IST
                  </span>
                </div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-(--muted) line-clamp-2">
                  {report.description}
                </p>
                {report.photoName ? (
                  <p className="mt-1 truncate text-[12px] text-(--muted)">Photo: {report.photoName}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
