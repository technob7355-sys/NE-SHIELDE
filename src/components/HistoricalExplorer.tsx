import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet'
import { History, Search } from 'lucide-react'
import { HISTORICAL_EVENTS, type HistoricalEvent } from '../data/historicalEvents'

function FlyToEvent({ event }: { event: (HistoricalEvent & { idx: number }) | null }) {
  const map = useMap()
  const key = event ? `${event.idx}` : null
  useEffect(() => {
    if (!event) return
    map.flyTo([event.lat, event.lng], 9, { duration: 1.0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return null
}

/**
 * Historical landslide explorer — verified past events ONLY.
 * Never mixed with current model predictions.
 * Source: NASA GLC/COOLR (2007–2018) + 6 verified 2021–2022 news events.
 */
export default function HistoricalExplorer() {
  const [q, setQ] = useState('')
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({})

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const yf = yearFrom.trim() === '' ? null : Number(yearFrom)
    const yt = yearTo.trim() === '' ? null : Number(yearTo)
    return HISTORICAL_EVENTS.map((e, idx) => ({ ...e, idx })).filter((e) => {
      if (needle && !e.name.toLowerCase().includes(needle)) return false
      const y = Number(e.date.slice(0, 4))
      if (yf != null && y < yf) return false
      if (yt != null && y > yt) return false
      return true
    })
  }, [q, yearFrom, yearTo])

  const selected =
    selectedIdx != null
      ? { ...HISTORICAL_EVENTS[selectedIdx], idx: selectedIdx }
      : null

  useEffect(() => {
    if (selectedIdx != null) {
      rowRefs.current[selectedIdx]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIdx])

  const years = useMemo(() => {
    const ys = HISTORICAL_EVENTS.map((e) => Number(e.date.slice(0, 4)))
    return { min: Math.min(...ys), max: Math.max(...ys) }
  }, [])

  const inputClass =
    'rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#106EBE] focus:outline-none'

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[15px] border border-[#D9D9D9] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_6px_20px_rgba(15,23,42,0.09)]">
        <div className="flex flex-wrap items-center gap-2">
          <History className="h-4 w-4 text-[#004F88]" aria-hidden="true" />
          <p className="text-[18px] font-bold text-[#0F172A]">Historical Landslide Explorer</p>
          <span className="ml-auto rounded-full bg-[#106EBE]/15 px-2.5 py-1 text-[13px] font-medium text-[#004F88]">
            {filtered.length} / {HISTORICAL_EVENTS.length} events
          </span>
        </div>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[#64748B]">
          Verified past events — NASA Global Landslide Catalog / COOLR ({years.min}–2018) plus 6
          verified 2021–2022 news events. These are <span className="text-[#0F172A]">observations</span>,
          not current predictions.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-3">
            <Search className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden="true" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by place name…"
              aria-label="Search historical events"
              className="w-full bg-transparent py-2 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
            />
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
            placeholder={`Year from (${years.min})`}
            aria-label="Year from"
            className={`${inputClass} w-[130px]`}
          />
          <input
            type="text"
            inputMode="numeric"
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
            placeholder={`Year to (${years.max})`}
            aria-label="Year to"
            className={`${inputClass} w-[130px]`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="overflow-hidden rounded-[15px] border border-[#D9D9D9]">
          <MapContainer
            center={[25.5, 93.0]}
            zoom={6}
            zoomControl={false}
            attributionControl={false}
            className="h-[320px] w-full md:h-[420px]"
          >
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            {HISTORICAL_EVENTS.map((e, i) => (
              <CircleMarker
                key={i}
                center={[e.lat, e.lng]}
                radius={i === selectedIdx ? 8 : 3.5}
                pathOptions={
                  i === selectedIdx
                    ? { fillColor: '#106EBE', fillOpacity: 1, color: '#FFFFFF', weight: 2 }
                    : { fillColor: '#FB923C', fillOpacity: 0.75, color: '#F0F0F0', weight: 0.5 }
                }
              />
            ))}
            <FlyToEvent event={selected} />
          </MapContainer>
        </div>

        <div className="flex max-h-[420px] flex-col overflow-hidden rounded-[15px] border border-[#D9D9D9] bg-white">
          <div className="overflow-y-auto">
            <table className="w-full text-[14px]">
              <thead className="sticky top-0 bg-[#F0F0F0]">
                <tr className="border-b border-[#D9D9D9] text-left text-[13px] tracking-wider text-[#64748B] uppercase">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5 text-right">Coords</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.idx}
                    ref={(el) => {
                      rowRefs.current[e.idx] = el
                    }}
                    onClick={() => setSelectedIdx(e.idx)}
                    className={`cursor-pointer border-b border-[#D9D9D9] last:border-b-0 hover:bg-[#E9E9E9] ${
                      e.idx === selectedIdx ? 'bg-[#106EBE]/10' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap text-[#64748B]">{e.date}</td>
                    <td className="px-4 py-2.5 text-[#0F172A]">{e.name}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap text-[#64748B]">
                      {e.lat.toFixed(2)}, {e.lng.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[#64748B]">
                      No events match these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
