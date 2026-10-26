import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  Check,
  CloudRain,
  Code2,
  Cpu,
  Crosshair,
  Eye,
  FileCheck,
  Landmark,
  MapPinned,
  Route,
  Shield,
  Siren,
  Users,
} from 'lucide-react'
import type { ZoneWithScore } from './types'
import { LevelBadge, riskColor } from './risk'

interface LandingProps {
  zones: ZoneWithScore[]
  loading: boolean
  onOpenDashboard: () => void
  onOpenAccuracy: () => void
  onOpenMap: () => void
}

const HERO_IMAGE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=87.5,22.0,98.0,29.8&bboxSR=4326&size=1200,800&format=jpg&f=image'

/** Fades a section up softly the first time it scrolls into view. */
function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${visible ? 'reveal-visible' : ''} ${className ?? ''}`}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-[12px] font-bold tracking-[0.18em] text-[#60A5FA] uppercase">
      <span className="h-px w-8 bg-[#3B82F6]" aria-hidden="true" />
      {children}
    </p>
  )
}

const STEPS = [
  {
    icon: CloudRain,
    chip: 'bg-[#3B82F6]/15 text-[#60A5FA]',
    title: 'Live weather, every zone',
    body: 'Rainfall (24h, 3-day, 30-day) and soil moisture are fetched live from Open-Meteo for each monitored slope — no hand-entered numbers, no estimates.',
  },
  {
    icon: Cpu,
    chip: 'bg-[#34D399]/15 text-[#34D399]',
    title: 'AI model scores the risk',
    body: 'A GradientBoosting model, trained on 1,740 weeks of real monsoon weather (2018–2022), turns those inputs into a 0–100 risk score and a Low → Critical level.',
  },
  {
    icon: MapPinned,
    chip: 'bg-[#FBBF24]/15 text-[#FBBF24]',
    title: 'Zones you can act on',
    body: 'Every zone appears on a live satellite map as a coloured risk zone, with its score, its inputs and what to do — plus citizen hazard reports from the ground.',
  },
]

const TRUST_POINTS = [
  {
    icon: Eye,
    title: 'Real data only',
    body: 'Every live number carries its source and fetch time. If an API fails, the dashboard says so — it never invents a number to fill the gap.',
  },
  {
    icon: FileCheck,
    title: 'An open formula',
    body: 'The training labels come from one documented formula applied to real weather — published in the repo, not hidden in a black box.',
  },
  {
    icon: Crosshair,
    title: 'An honest backtest',
    body: 'Against 7 documented landslides and 7 dry-season controls, the model scores 57.1% — with every miss explained. We show the misses, not just the hits.',
  },
  {
    icon: Code2,
    title: 'Open source',
    body: 'The full pipeline — data fetch, training, backtest and dashboard — is public on GitHub, so any expert can audit or reproduce it.',
  },
]

const CUSTOMERS = [
  {
    icon: Landmark,
    title: 'Disaster management authorities',
    body: 'District and state teams get a live risk picture for the slopes they are responsible for, in one view.',
  },
  {
    icon: Route,
    title: 'Road & rail operators',
    body: 'Highway and railway corridors (NH-10, NH-13, NH-6 and more) are exactly the kind of linear assets this system watches.',
  },
  {
    icon: Users,
    title: 'Communities & travellers',
    body: 'Anyone living near or travelling through a monitored slope can check its risk before they go — in plain language.',
  },
  {
    icon: Shield,
    title: 'Insurers & researchers',
    body: 'A documented, reproducible risk record — with an honest accuracy audit — is a foundation for underwriting and study.',
  },
]

const ROADMAP = [
  {
    phase: 'Live now',
    dot: 'bg-[#34D399]',
    title: 'The working dashboard',
    body: '20 zones across 4 states, live weather, satellite risk map, accuracy audit and citizen reporting.',
  },
  {
    phase: 'Next',
    dot: 'bg-[#60A5FA]',
    title: 'Alerts that reach people',
    body: 'SMS and WhatsApp alerts when a zone turns High or Critical, 72-hour forecast risk, and trend charts per zone.',
  },
  {
    phase: 'Then',
    dot: 'bg-[#8CA0B8]',
    title: 'Scale across the hills',
    body: 'IMD rain-gauge and GSI landslide-inventory data in the model, all Northeast districts, and an API for government systems.',
  },
]

export default function Landing({ zones, loading, onOpenDashboard, onOpenAccuracy, onOpenMap }: LandingProps) {
  const states = new Set(zones.map((z) => z.location.state)).size
  const withScore = [...zones]
    .filter((z) => z.prediction)
    .sort((a, b) => (b.prediction?.score ?? 0) - (a.prediction?.score ?? 0))
  const snapshot = (withScore.length > 0 ? withScore : zones).slice(0, 5)
  const topZone = withScore[0]

  return (
    <div className="flex flex-col gap-16 pb-4 md:gap-20">
      {/* Hero — real satellite imagery of the Northeast behind the headline */}
      <section
        className="overflow-hidden rounded-2xl border border-[#1E2D47] bg-[#101A2E] bg-cover bg-center p-6 md:p-10"
        style={{
          backgroundImage: `linear-gradient(rgba(8,13,26,0.82), rgba(8,13,26,0.9)), url("${HERO_IMAGE}")`,
        }}
      >
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-[12px] font-medium text-[#E8EEF7] backdrop-blur-sm">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34D399] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#34D399]" />
              </span>
              Live now • Northeast India
            </p>
            <h2 className="font-display mt-5 text-[40px] leading-[1.02] font-semibold tracking-tight text-white md:text-[60px]">
              Before the slope fails,{' '}
              <span className="text-gradient">people should know.</span>
            </h2>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-[#C7D3E8] md:text-[17px]">
              NE-SHIELD watches the rain and the soil on the Northeast&apos;s most vulnerable slopes
              and turns them into a live landslide risk score — so warnings reach people{' '}
              <span className="font-medium text-white">before</span> disaster, not after it.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpenDashboard}
                className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-6 py-3.5 text-[14px] font-bold text-white shadow-[0_8px_30px_rgba(59,130,246,0.35)] transition-all duration-300 hover:bg-[#2563EB] hover:shadow-[0_8px_36px_rgba(59,130,246,0.5)] active:scale-[0.98]"
              >
                View the live dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onOpenAccuracy}
                className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-black/30 px-6 py-3.5 text-[14px] font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-black/50 active:scale-[0.98]"
              >
                See how we prove accuracy
              </button>
            </div>
            <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#C7D3E8]">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#34D399]" aria-hidden="true" /> No fake numbers
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#34D399]" aria-hidden="true" /> Open source
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#34D399]" aria-hidden="true" /> Honest accuracy
              </span>
            </p>
          </div>

          {/* Live product snapshot — glass card over the imagery */}
          <div className="min-w-0 rounded-2xl border border-white/15 bg-[#0B1220]/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-bold tracking-wide text-[#E8EEF7] uppercase">
                Live risk snapshot
              </p>
              <span className="inline-flex items-center gap-1.5 text-[12px] text-[#8CA0B8]">
                <span className="h-2 w-2 rounded-full bg-[#34D399]" aria-hidden="true" />
                Open-Meteo
              </span>
            </div>
            <div className="mt-4 flex flex-col">
              {snapshot.map((zone) => {
                const color = zone.prediction ? riskColor(zone.prediction.level) : '#8CA0B8'
                return (
                  <button
                    key={zone.location.id}
                    type="button"
                    onClick={onOpenMap}
                    className="flex items-center gap-3 border-b border-[#1E2D47] py-3 text-left transition-colors last:border-b-0 last:pb-0 first:pt-0 hover:bg-[#16233C]/50 active:bg-[#1E2D47]"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-[#E8EEF7]">
                        {zone.location.name}
                      </span>
                      <span className="block truncate text-[12px] text-[#8CA0B8]">
                        {zone.location.state}
                      </span>
                    </span>
                    <span className="shrink-0 text-[14px] font-bold whitespace-nowrap text-[#E8EEF7]">
                      {zone.prediction ? Math.round(zone.prediction.score) : '—'}
                    </span>
                    {zone.prediction ? (
                      <span className="shrink-0">
                        <LevelBadge level={zone.prediction.level} />
                      </span>
                    ) : (
                      <span className="shrink-0 text-[12px] text-[#8CA0B8]">
                        {loading ? 'Loading…' : 'Waiting for live data'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={onOpenMap}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#1E2D47] bg-[#16233C] px-4 py-2.5 text-[13px] font-medium text-[#E8EEF7] transition-all duration-300 hover:bg-[#1E2D47] active:scale-[0.98]"
            >
              Open the full live map
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            {topZone?.prediction ? (
              <p className="mt-3 text-center text-[12px] text-[#8CA0B8]">
                Highest risk right now: {topZone.location.name} —{' '}
                {Math.round(topZone.prediction.score)} ({topZone.prediction.level})
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-10 flex flex-col divide-y divide-white/10 border-t border-white/10 pt-6 md:flex-row md:divide-x md:divide-y-0">
          <div className="flex-1 py-4 pr-4 md:py-0">
            <p className="font-display text-[36px] leading-none font-semibold text-[#60A5FA]">
              {zones.length || 20}
            </p>
            <p className="mt-2 text-[13px] text-[#C7D3E8]">Zones monitored live</p>
          </div>
          <div className="flex-1 py-4 pr-4 md:px-6 md:py-0">
            <p className="font-display text-[36px] leading-none font-semibold text-white">
              {states || 4}
            </p>
            <p className="mt-2 text-[13px] text-[#C7D3E8]">States covered</p>
          </div>
          <div className="flex-1 py-4 pr-4 md:px-6 md:py-0">
            <p className="font-display text-[36px] leading-none font-semibold text-white">1,740</p>
            <p className="mt-2 text-[13px] text-[#C7D3E8]">Weeks of monsoon data trained on</p>
          </div>
          <div className="flex-1 py-4 md:px-6 md:py-0">
            <p className="font-display text-[36px] leading-none font-semibold text-[#FBBF24]">
              57.1%
            </p>
            <p className="mt-2 text-[13px] text-[#C7D3E8]">Honest real-event backtest score</p>
          </div>
        </div>
      </section>

      {/* The problem — numbers that hit first */}
      <Reveal>
        <SectionLabel>The problem</SectionLabel>
        <h3 className="font-display mt-4 max-w-3xl text-[28px] leading-[1.1] font-semibold text-[#E8EEF7] md:text-[40px]">
          374 landslides. 63 lives. One monsoon.
        </h3>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[#8CA0B8]">
          Fragile young Himalayan geology, steep slopes and intense monsoon rain make the Northeast
          exceptionally slide-prone — while road-cutting and construction keep adding pressure. And
          most warnings today are generic district weather alerts: not slope-by-slope, and not in
          time to move people or close a road.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div>
            <span className="block h-1 w-12 rounded-full bg-[#F87171]" aria-hidden="true" />
            <p className="font-display mt-4 text-[48px] leading-none font-semibold text-[#E8EEF7]">
              374
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-[#8CA0B8]">
              Landslide incidents documented across the Northeast in 2025 alone.
            </p>
          </div>
          <div>
            <span className="block h-1 w-12 rounded-full bg-[#FB923C]" aria-hidden="true" />
            <p className="font-display mt-4 text-[48px] leading-none font-semibold text-[#E8EEF7]">
              63
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-[#8CA0B8]">
              Lives lost to those landslides in 2025 — 30 in Assam, 12 each in Arunachal Pradesh and
              Sikkim.
            </p>
          </div>
          <div>
            <span className="block h-1 w-12 rounded-full bg-[#FBBF24]" aria-hidden="true" />
            <p className="font-display mt-4 text-[48px] leading-none font-semibold text-[#E8EEF7]">
              42%
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-[#8CA0B8]">
              Of India&apos;s total landslide hazard zone lies in the Northeast, per Geological Survey
              of India figures.
            </p>
          </div>
        </div>
        <p className="mt-6 text-[12px] text-[#8CA0B8]">
          Sources: NESAC Seasonal Landslide Inventory for the North Eastern Region, 2025; GSI
          landslide-prone area figures.
        </p>
      </Reveal>

      {/* How it works */}
      <Reveal>
        <SectionLabel>How it works</SectionLabel>
        <h3 className="font-display mt-4 text-[28px] font-semibold text-[#E8EEF7] md:text-[40px]">
          Live weather in. Risk out. No black box.
        </h3>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div
                key={step.title}
                className="card-hover rounded-xl border border-[#1E2D47] bg-[#101A2E] p-6"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${step.chip}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-display text-[44px] leading-none font-semibold text-[#233452]">
                    {`0${i + 1}`}
                  </span>
                </div>
                <p className="mt-5 text-[17px] font-bold text-[#E8EEF7]">{step.title}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-[#8CA0B8]">{step.body}</p>
              </div>
            )
          })}
        </div>
      </Reveal>

      {/* Why trust us */}
      <Reveal>
        <SectionLabel>Why it can be trusted</SectionLabel>
        <h3 className="font-display mt-4 text-[28px] font-semibold text-[#E8EEF7] md:text-[40px]">
          We publish our misses, not just our hits.
        </h3>
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {TRUST_POINTS.map((point) => {
            const Icon = point.icon
            return (
              <div
                key={point.title}
                className="card-hover rounded-xl border border-[#1E2D47] bg-[#101A2E] p-6"
              >
                <p className="flex items-center gap-3 text-[17px] font-bold text-[#E8EEF7]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#34D399]/15">
                    <Icon className="h-4.5 w-4.5 text-[#34D399]" aria-hidden="true" />
                  </span>
                  {point.title}
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-[#8CA0B8]">{point.body}</p>
              </div>
            )
          })}
        </div>
        <button
          type="button"
          onClick={onOpenAccuracy}
          className="group mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-[#60A5FA] transition-all duration-300 hover:text-[#93C5FD] active:scale-[0.98]"
        >
          Read the full accuracy audit, misses included
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </button>
      </Reveal>

      {/* Who it serves — editorial list, not another card grid */}
      <Reveal>
        <SectionLabel>Who it serves</SectionLabel>
        <h3 className="font-display mt-4 text-[28px] font-semibold text-[#E8EEF7] md:text-[40px]">
          Built for the people who have to decide.
        </h3>
        <div className="mt-8 divide-y divide-[#1E2D47] border-y border-[#1E2D47]">
          {CUSTOMERS.map((customer) => {
            const Icon = customer.icon
            return (
              <div key={customer.title} className="group flex items-start gap-4 py-6">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6]/15 transition-colors duration-300 group-hover:bg-[#3B82F6]/25">
                  <Icon className="h-5 w-5 text-[#60A5FA]" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-bold text-[#E8EEF7]">{customer.title}</p>
                  <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-[#8CA0B8]">
                    {customer.body}
                  </p>
                </div>
                <ArrowRight
                  className="mt-2 h-5 w-5 shrink-0 text-[#1E2D47] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#60A5FA]"
                  aria-hidden="true"
                />
              </div>
            )
          })}
        </div>
      </Reveal>

      {/* Roadmap — timeline, not cards */}
      <Reveal>
        <SectionLabel>Roadmap</SectionLabel>
        <h3 className="font-display mt-4 text-[28px] font-semibold text-[#E8EEF7] md:text-[40px]">
          Where this goes next.
        </h3>
        <div className="relative mt-8 flex flex-col gap-8">
          <span
            className="absolute top-2 bottom-2 left-[7px] w-0.5 bg-[#1E2D47]"
            aria-hidden="true"
          />
          {ROADMAP.map((item) => (
            <div key={item.title} className="flex gap-4">
              <span
                className={`mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#0B1220] ${item.dot}`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-[12px] font-bold tracking-wide text-[#8CA0B8] uppercase">
                  {item.phase}
                </p>
                <p className="mt-1 text-[17px] font-bold text-[#E8EEF7]">{item.title}</p>
                <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-[#8CA0B8]">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Partner CTA — imagery-backed band */}
      <Reveal>
        <section
          className="overflow-hidden rounded-2xl border border-[#1E2D47] bg-[#101A2E] bg-cover bg-bottom p-6 md:p-10"
          style={{
            backgroundImage: `linear-gradient(rgba(8,13,26,0.88), rgba(8,13,26,0.94)), url("${HERO_IMAGE}")`,
          }}
        >
          <div className="flex items-start gap-4">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6] shadow-[0_8px_30px_rgba(59,130,246,0.4)] sm:flex">
              <Siren className="h-6 w-6 text-white" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-[28px] leading-tight font-semibold text-white md:text-[36px]">
                Pilot NE-SHIELD in your district.
              </h3>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#C7D3E8]">
                We are looking for pilot districts, department partners and supporters to take this
                from 20 zones to every vulnerable slope in the Northeast. See the system live first
                — then talk to us about bringing it to your region.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-6 py-3.5 text-[14px] font-bold text-white shadow-[0_8px_30px_rgba(59,130,246,0.35)] transition-all duration-300 hover:bg-[#2563EB] active:scale-[0.98]"
                >
                  Open the live dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <a
                  href="https://github.com/technob7355-sys/NE-SHIELDE"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-black/30 px-6 py-3.5 text-[14px] font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-black/50 active:scale-[0.98]"
                >
                  Explore the code on GitHub
                </a>
              </div>
              <p className="mt-6 text-[12px] leading-relaxed text-[#8CA0B8]">
                NE-SHIELD is an advisory system. It supports — and never replaces — official warnings
                from disaster management authorities.
              </p>
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  )
}
