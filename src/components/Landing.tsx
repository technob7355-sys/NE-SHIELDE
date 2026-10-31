import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Cpu,
  Database,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Map as MapIcon,
  Newspaper,
  RefreshCw,
} from 'lucide-react'
import DashboardMap from './dashboard/DashboardMap'
import { LevelBadge, formatDateTimeIST } from './risk'
import type { Alert } from '../services/alerts'
import type { Notification } from '../services/notifications'
import type { ZoneWithScore } from './types'

interface LandingProps {
  zones: ZoneWithScore[]
  loading: boolean
  alerts: Alert[]
  notifications: Notification[]
  onOpenDashboard: () => void
  onOpenMap: () => void
  onOpenAlerts: () => void
  onOpenHistory: () => void
}

const GITHUB_URL = 'https://github.com/technob7355-sys/NE-SHIELDE'

/* ------------------------------------------------------------------ */
/* Portal panel — BhuSanket format: dark-blue header strip, white body */
/* ------------------------------------------------------------------ */
function PortalPanel({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-[15px] border border-[#D9D9D9] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] ${className ?? ''}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 bg-[#004F88] px-4 py-3">
        <h3 className="text-[16px] font-bold text-white">{title}</h3>
        {action}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Hero carousel — 3 HQ landslide photos, prev/next + dots            */
/* ------------------------------------------------------------------ */
const SLIDES = [
  {
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Landslide_Nigulsari%2C_Kinnaur.jpg/1920px-Landslide_Nigulsari%2C_Kinnaur.jpg',
    alt: 'Landslide blocking a mountain road at Nigulsari, Kinnaur',
    title: 'Before the slope fails, people should know.',
    sub: "NE-SHIELD watches the rain and the soil on the Northeast's most vulnerable slopes and turns them into a live landslide risk score — so warnings reach people before disaster, not after it.",
    cta: true,
  },
  {
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Landslides_in_Himachal_Pradesh.jpg/1920px-Landslides_in_Himachal_Pradesh.jpg',
    alt: 'Landslide scar on a Himachal hillside',
    title: 'Live risk scores for 20 Northeast zones.',
    sub: 'Open-Meteo rainfall and soil data, refreshed every 12 minutes. Every zone scored, every miss shown honestly.',
    cta: false,
  },
  {
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Road_construction_causing_landslides_in_the_Himalaya%2C_AJTJ.jpg/1920px-Road_construction_causing_landslides_in_the_Himalaya%2C_AJTJ.jpg',
    alt: 'Hillside landslide debris',
    title: 'Built for the people who have to decide.',
    sub: 'A control-room dashboard for disaster-management authorities — clean alerts, honest data, no fake numbers.',
    cta: false,
  },
]

function HeroCarousel({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 6000)
    return () => clearInterval(t)
  }, [])
  const slide = SLIDES[idx]
  return (
    <section className="relative overflow-hidden rounded-[15px] border border-[#003A66]">
      <div className="relative h-[380px] md:h-[440px]">
        {SLIDES.map((s, i) => (
          <div
            key={s.img}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
            style={{ backgroundImage: `url("${s.img}")`, opacity: i === idx ? 1 : 0 }}
            aria-hidden={i !== idx}
          />
        ))}
        <div
          className="absolute inset-0 bg-[linear-gradient(100deg,rgba(0,79,136,0.92)_25%,rgba(0,79,136,0.55)_60%,rgba(0,79,136,0.20))]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 flex flex-col justify-center px-14 py-6 md:px-20 md:py-10">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7CC4FF] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7CC4FF]" />
            </span>
            Live now • Northeast India
          </p>
          <h2
            key={idx}
            className="font-display mt-4 max-w-2xl text-[32px] leading-[1.05] font-extrabold tracking-[-0.5px] text-white md:text-[48px]"
          >
            {slide.title}
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/85 md:text-[16px]">
            {slide.sub}
          </p>
          {slide.cta ? (
            <div className="mt-6">
              <button
                type="button"
                onClick={onOpenDashboard}
                className="inline-flex items-center gap-2 rounded-full bg-[#106EBE] px-7 py-3.5 text-[14px] font-bold text-white shadow-[0_8px_30px_rgba(16,110,190,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0D5DA3] active:scale-[0.98]"
              >
                View the live dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-white/80">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#7CC4FF]" aria-hidden="true" /> No fake numbers
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#7CC4FF]" aria-hidden="true" /> Open source
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#7CC4FF]" aria-hidden="true" /> Honest accuracy
                </span>
              </p>
            </div>
          ) : null}
        </div>
        {/* prev / next */}
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => setIdx((idx + SLIDES.length - 1) % SLIDES.length)}
          className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/35 p-2 text-white backdrop-blur-sm transition hover:bg-black/55"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => setIdx((idx + 1) % SLIDES.length)}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/35 p-2 text-white backdrop-blur-sm transition hover:bg-black/55"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        {/* dots */}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.img}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-2 rounded-full transition-all ${i === idx ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* How It Works — SVG/CSS flow diagram                                */
/* ------------------------------------------------------------------ */
const FLOW_STEPS = [
  {
    icon: CloudRain,
    title: 'Weather Data',
    body: 'Open-Meteo rainfall, soil moisture & temperature — refreshed every 12 minutes.',
  },
  {
    icon: Cpu,
    title: 'ML Model',
    body: 'Random Forest trained & tested on wet days only. Honest 68.3% — misses shown openly.',
  },
  {
    icon: Gauge,
    title: 'Risk Score',
    body: '0–100 score per zone. Critical ≥ 80 · High ≥ 65 · Moderate ≥ 40.',
  },
  {
    icon: Bell,
    title: 'Alerts & Warnings',
    body: 'Threshold crossings & rapid escalation feed the notification centre.',
  },
]

function HowItWorks() {
  return (
    <PortalPanel title="How It Works">
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        {FLOW_STEPS.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.title} className="flex flex-1 flex-col md:flex-row md:items-center">
              <div className="flex flex-1 items-start gap-3 rounded-[12px] border border-[#D9D9D9] bg-[#F0F0F0] p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#004F88]">
                  <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[15px] font-bold text-[#0F172A]">
                    {i + 1}. {s.title}
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-[#475569]">
                    {s.body}
                  </span>
                </span>
              </div>
              {i < FLOW_STEPS.length - 1 ? (
                <ArrowRight
                  className="mx-auto my-1 h-5 w-5 shrink-0 rotate-90 text-[#106EBE] md:mx-2 md:my-0 md:rotate-0"
                  aria-hidden="true"
                />
              ) : null}
            </div>
          )
        })}
      </div>
    </PortalPanel>
  )
}

/* ------------------------------------------------------------------ */
/* Landing — BhuSanket-format portal homepage                          */
/* ------------------------------------------------------------------ */
const MILESTONES: { title: string; body: string }[] = [
  {
    title: 'Operational dashboard goes live',
    body: '20 Northeast zones monitored with live risk scores, alerts & notification centre.',
  },
  {
    title: 'Honest wet-day model published',
    body: '68.3% on unseen rainy days — trained and tested on wet days only, misses shown openly.',
  },
  {
    title: '521 historical events mapped',
    body: 'NASA GLC/COOLR landslide inventory (2007–2018) wired into the explorer.',
  },
]

export default function Landing({
  zones,
  loading,
  alerts,
  notifications,
  onOpenDashboard,
  onOpenMap,
  onOpenAlerts,
  onOpenHistory,
}: LandingProps) {
  const states = useMemo(() => new Set(zones.map((z) => z.location.state)).size, [zones])

  const bulletinZones = useMemo(
    () =>
      zones
        .filter((z) => z.prediction)
        .sort((a, b) => (b.prediction?.score ?? 0) - (a.prediction?.score ?? 0))
        .slice(0, 3),
    [zones],
  )

  const byState = useMemo(() => {
    const m = new Map<string, number>()
    zones.forEach((z) => m.set(z.location.state, (m.get(z.location.state) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [zones])

  const newsItems = useMemo(() => {
    const fromAlerts = notifications.slice(0, 5).map((n) => ({
      title: n.title,
      body: n.body,
      time: formatDateTimeIST(n.createdAt) + ' IST',
    }))
    const miles = MILESTONES.map((m) => ({ title: m.title, body: m.body, time: 'Project milestone' }))
    return [...fromAlerts, ...miles]
  }, [notifications])

  const issuedAt = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata',
      }).format(new Date()) + ' IST'
    } catch {
      return ''
    }
  }, [])

  return (
    <div className="flex flex-col gap-5 bg-[#F0F0F0] pb-6">
      <HeroCarousel onOpenDashboard={onOpenDashboard} />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {/* Landslide Forecast Bulletin */}
        <PortalPanel
          title="Landslide Forecast Bulletin"
          action={
            <button
              type="button"
              onClick={onOpenDashboard}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[13px] font-medium whitespace-nowrap text-white transition hover:bg-white/25"
            >
              Open dashboard <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          }
        >
          <p className="flex items-center gap-2 text-[13px] text-[#64748B]">
            <FileText className="h-4 w-4 text-[#106EBE]" aria-hidden="true" />
            Issued {issuedAt}
          </p>
          {loading ? (
            <p className="mt-3 text-[14px] text-[#64748B]">Loading live data…</p>
          ) : bulletinZones.length === 0 ? (
            <p className="mt-3 rounded-[10px] border border-[#D9D9D9] bg-[#F0F0F0] p-3 text-[14px] leading-relaxed text-[#475569]">
              Bulletin unavailable — waiting for live data. Zones are never assumed safe when data
              is stale or missing.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {bulletinZones.map((z) => (
                <div
                  key={z.location.id}
                  className="flex items-center justify-between gap-2 rounded-[10px] border border-[#D9D9D9] bg-[#F0F0F0] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-[#0F172A]">
                      {z.location.name}
                    </p>
                    <p className="text-[13px] text-[#64748B]">{z.location.state}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[14px] font-bold text-[#0F172A]">
                      {z.prediction?.score}
                    </span>
                    <LevelBadge level={z.prediction?.level ?? 'Unknown'} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[13px] leading-relaxed text-[#64748B]">
            Model-generated bulletin — not an official government warning.
          </p>
        </PortalPanel>

        {/* Live susceptibility map */}
        <PortalPanel
          title="Live Susceptibility Map"
          className="md:col-span-2 xl:col-span-1"
          action={
            <button
              type="button"
              onClick={onOpenMap}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[13px] font-medium text-white transition hover:bg-white/25"
            >
              Full map <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          }
        >
          <div className="h-[300px] overflow-hidden rounded-[10px] border border-[#D9D9D9]">
            <DashboardMap zones={zones} onSelectZone={() => onOpenMap()} />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[#64748B]">
            <MapIcon className="h-4 w-4 text-[#106EBE]" aria-hidden="true" />
            Satellite view · 20 zones · tap a zone for details
          </p>
        </PortalPanel>

        {/* Recent news */}
        <PortalPanel
          title="Recent News"
          action={
            <button
              type="button"
              onClick={onOpenAlerts}
              className="text-[13px] font-medium text-white/85 underline underline-offset-2 transition hover:text-white"
            >
              (View Archive)
            </button>
          }
        >
          <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1">
            {newsItems.map((n, i) => (
              <div
                key={i}
                className="rounded-[10px] border border-[#D9D9D9] bg-[#F0F0F0] px-3 py-2"
              >
                <p className="flex items-start gap-2 text-[14px] font-semibold text-[#0F172A]">
                  <Newspaper
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#106EBE]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">{n.title}</span>
                </p>
                <p className="mt-0.5 line-clamp-2 pl-6 text-[13px] leading-relaxed text-[#475569]">
                  {n.body}
                </p>
                <p className="mt-1 pl-6 text-[12px] text-[#64748B]">{n.time}</p>
              </div>
            ))}
          </div>
        </PortalPanel>

        {/* Project status */}
        <PortalPanel title="Project Status">
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: MapIcon, value: '20', label: 'Zones Monitored' },
              { icon: BarChart3, value: String(states), label: 'States Covered' },
              { icon: Database, value: '521', label: 'Historical Events' },
              { icon: RefreshCw, value: '12 min', label: 'Live Refresh Cycle' },
            ].map((c) => {
              const Icon = c.icon
              return (
                <div
                  key={c.label}
                  className="rounded-[10px] border border-[#D9D9D9] bg-[#F0F0F0] p-3 text-center"
                >
                  <Icon
                    className="mx-auto h-5 w-5 text-[#106EBE]"
                    aria-hidden="true"
                  />
                  <p className="mt-1 text-[28px] leading-none font-extrabold text-[#004F88]">
                    {c.value}
                  </p>
                  <p className="mt-1 text-[13px] font-medium text-[#475569]">{c.label}</p>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-[#64748B]">
            Live operational footprint — every number on this portal is real and verifiable.
          </p>
        </PortalPanel>

        {/* State-wise report */}
        <PortalPanel title="State Wise Landslide Report">
          <div className="flex items-center justify-between rounded-[10px] bg-[#004F88] px-4 py-3">
            <p className="text-[14px] font-bold text-white">Monitoring zones</p>
            <p className="text-[32px] leading-none font-extrabold text-white">{zones.length}</p>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {byState.map(([state, count]) => (
              <div
                key={state}
                className="flex items-center justify-between rounded-[8px] border border-[#D9D9D9] px-3 py-1.5 text-[14px]"
              >
                <span className="font-medium text-[#0F172A]">{state}</span>
                <span className="font-bold text-[#004F88]">{count} zones</span>
              </div>
            ))}
          </div>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-[#106EBE] px-4 py-2 text-[13px] font-bold text-[#106EBE] transition hover:bg-[#106EBE] hover:text-white"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Source & data on GitHub
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </PortalPanel>

        {/* Landslide inventory */}
        <PortalPanel title="Landslide Inventory">
          <div className="flex items-center gap-4">
            <p className="text-[40px] leading-none font-extrabold text-[#004F88]">521</p>
            <p className="text-[14px] leading-relaxed text-[#475569]">
              historical landslide events mapped from the NASA GLC / COOLR inventory (2007–2018).
            </p>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-[#64748B]">
            Search and filter every event by year and location in the Historical Explorer.
          </p>
          <button
            type="button"
            onClick={onOpenHistory}
            className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#106EBE] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#004F88]"
          >
            Open Historical Explorer
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="mt-3 text-[13px] leading-relaxed text-[#64748B]">
            {alerts.length > 0
              ? `${alerts.length} active model alert${alerts.length === 1 ? '' : 's'} right now — see the Alerts tab.`
              : 'No active model alerts right now.'}
          </p>
        </PortalPanel>
      </div>

      <HowItWorks />

      <p className="text-center text-[13px] text-[#64748B]">
        NE-SHIELD · Landslide Early Warning System for Northeast India · Model outputs are not
        official government warnings.
      </p>
    </div>
  )
}
