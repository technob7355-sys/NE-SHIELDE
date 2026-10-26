import {
  ArrowRight,
  Check,
  CloudRain,
  Cpu,
  Landmark,
  MapPinned,
  Route,
  Shield,
  Siren,
  Users,
} from 'lucide-react'
import type { ZoneWithScore } from './types'
import { riskColor } from './risk'

interface LandingProps {
  zones: ZoneWithScore[]
  loading: boolean
  onOpenDashboard: () => void
  onOpenAccuracy: () => void
}

const STEPS = [
  {
    icon: CloudRain,
    title: 'Live weather, every zone',
    body: 'Rainfall (24h, 3-day, 30-day) and soil moisture are fetched live from Open-Meteo for each monitored slope — no hand-entered numbers, no estimates.',
  },
  {
    icon: Cpu,
    title: 'AI model scores the risk',
    body: 'A GradientBoosting model, trained on 1,740 weeks of real monsoon weather (2018–2022), turns those inputs into a 0–100 risk score and a Low → Critical level.',
  },
  {
    icon: MapPinned,
    title: 'Zones you can act on',
    body: 'Every zone appears on a live satellite map as a coloured risk zone, with its score, its inputs and what to do — plus citizen hazard reports from the ground.',
  },
]

const TRUST_POINTS = [
  {
    title: 'Real data only',
    body: 'Every live number carries its source and fetch time. If an API fails, the dashboard says so — it never invents a number to fill the gap.',
  },
  {
    title: 'An open formula',
    body: 'The training labels come from one documented formula applied to real weather — published in the repo, not hidden in a black box.',
  },
  {
    title: 'An honest backtest',
    body: 'Against 7 documented landslides and 7 dry-season controls, the model scores 57.1% — with every miss explained. We show the misses, not just the hits.',
  },
  {
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
    title: 'The working dashboard',
    body: '20 zones across 4 states, live weather, satellite risk map, accuracy audit and citizen reporting.',
    done: true,
  },
  {
    phase: 'Next',
    title: 'Alerts that reach people',
    body: 'SMS and WhatsApp alerts when a zone turns High or Critical, 72-hour forecast risk, and trend charts per zone.',
    done: false,
  },
  {
    phase: 'Then',
    title: 'Scale across the hills',
    body: 'IMD rain-gauge and GSI landslide-inventory data in the model, all Northeast districts, and an API for government systems.',
    done: false,
  },
]

export default function Landing({ zones, loading, onOpenDashboard, onOpenAccuracy }: LandingProps) {
  const states = new Set(zones.map((z) => z.location.state)).size
  const withScore = zones.filter((z) => z.prediction)
  const topZone = [...withScore].sort(
    (a, b) => (b.prediction?.score ?? 0) - (a.prediction?.score ?? 0),
  )[0]

  return (
    <div className="flex flex-col gap-10 pb-4">
      {/* Hero */}
      <section className="rounded-2xl border border-[#1E2D47] bg-[#101A2E] p-6 md:p-10">
        <p className="inline-flex items-center gap-2 rounded-full border border-[#1E2D47] bg-[#16233C] px-3 py-1 text-[12px] font-medium text-[#8CA0B8]">
          <span className="h-2 w-2 rounded-full bg-[#34D399]" aria-hidden="true" />
          AI-powered landslide early warning • Northeast India
        </p>
        <h2 className="mt-5 max-w-3xl text-[28px] leading-tight font-bold text-[#E8EEF7] md:text-[40px]">
          Before the slope fails, people should know.
        </h2>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[#8CA0B8]">
          NE-SHIELD watches the rain and the soil on Northeast India&apos;s most vulnerable slopes,
          scores the landslide risk with an AI model, and shows it on a live map — so authorities,
          road operators and families can act before disaster, not after it.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenDashboard}
            className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#2563EB]"
          >
            View the live dashboard
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onOpenAccuracy}
            className="inline-flex items-center gap-2 rounded-lg border border-[#1E2D47] bg-[#16233C] px-5 py-3 text-[14px] font-medium text-[#E8EEF7] transition-colors hover:bg-[#1E2D47]"
          >
            See how we prove accuracy
          </button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-[#1E2D47] bg-[#0B1220] p-4">
            <p className="text-[28px] leading-none font-bold text-[#E8EEF7]">{zones.length || 20}</p>
            <p className="mt-1.5 text-[13px] text-[#8CA0B8]">Zones monitored live</p>
          </div>
          <div className="rounded-xl border border-[#1E2D47] bg-[#0B1220] p-4">
            <p className="text-[28px] leading-none font-bold text-[#E8EEF7]">{states || 4}</p>
            <p className="mt-1.5 text-[13px] text-[#8CA0B8]">States covered</p>
          </div>
          <div className="rounded-xl border border-[#1E2D47] bg-[#0B1220] p-4">
            <p className="text-[28px] leading-none font-bold text-[#E8EEF7]">1,740</p>
            <p className="mt-1.5 text-[13px] text-[#8CA0B8]">Weeks of monsoon data trained on</p>
          </div>
          <div className="rounded-xl border border-[#1E2D47] bg-[#0B1220] p-4">
            <p className="text-[28px] leading-none font-bold text-[#E8EEF7]">57.1%</p>
            <p className="mt-1.5 text-[13px] text-[#8CA0B8]">Honest real-event backtest score</p>
          </div>
        </div>

        {!loading && topZone?.prediction ? (
          <p className="mt-4 text-[13px] text-[#8CA0B8]">
            Highest risk right now:{' '}
            <span className="font-medium text-[#E8EEF7]">{topZone.location.name}</span> — score{' '}
            {Math.round(topZone.prediction.score)} (
            <span style={{ color: riskColor(topZone.prediction.level) }}>
              {topZone.prediction.level}
            </span>
            )
          </p>
        ) : null}
      </section>

      {/* The problem */}
      <section>
        <p className="text-[13px] font-medium tracking-wide text-[#3B82F6] uppercase">The problem</p>
        <h3 className="mt-2 max-w-2xl text-[20px] leading-snug font-bold text-[#E8EEF7]">
          The Northeast carries India&apos;s heaviest landslide burden — and warnings arrive too late.
        </h3>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-[#8CA0B8]">
          Fragile young Himalayan geology, steep slopes and intense monsoon rain make the region
          exceptionally slide-prone, while road-cutting and construction keep adding pressure. Most
          warnings today are generic district weather alerts — not slope-by-slope risk, and not in
          time to move people or close a road.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
            <p className="text-[28px] leading-none font-bold text-[#E8EEF7]">374</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#8CA0B8]">
              Landslide incidents documented across the Northeast in 2025 alone.
            </p>
          </div>
          <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
            <p className="text-[28px] leading-none font-bold text-[#E8EEF7]">63</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#8CA0B8]">
              Lives lost to those landslides in 2025 — 30 in Assam, 12 each in Arunachal Pradesh and
              Sikkim.
            </p>
          </div>
          <div className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
            <p className="text-[28px] leading-none font-bold text-[#E8EEF7]">42%</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#8CA0B8]">
              Of India&apos;s total landslide hazard zone lies in the Northeast, per Geological Survey
              of India figures.
            </p>
          </div>
        </div>
        <p className="mt-3 text-[12px] text-[#8CA0B8]">
          Sources: NESAC Seasonal Landslide Inventory for the North Eastern Region, 2025; GSI
          landslide-prone area figures.
        </p>
      </section>

      {/* How it works */}
      <section>
        <p className="text-[13px] font-medium tracking-wide text-[#3B82F6] uppercase">How it works</p>
        <h3 className="mt-2 text-[20px] font-bold text-[#E8EEF7]">
          Live weather in. Risk out. No black box.
        </h3>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#16233C]">
                    <Icon className="h-5 w-5 text-[#3B82F6]" aria-hidden="true" />
                  </span>
                  <span className="text-[20px] font-bold text-[#8CA0B8]">{`0${i + 1}`}</span>
                </div>
                <p className="mt-4 text-[16px] font-bold text-[#E8EEF7]">{step.title}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-[#8CA0B8]">{step.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Why trust us */}
      <section>
        <p className="text-[13px] font-medium tracking-wide text-[#3B82F6] uppercase">
          Why it can be trusted
        </p>
        <h3 className="mt-2 text-[20px] font-bold text-[#E8EEF7]">
          We publish our misses, not just our hits.
        </h3>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {TRUST_POINTS.map((point) => (
            <div key={point.title} className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
              <p className="flex items-center gap-2 text-[16px] font-bold text-[#E8EEF7]">
                <Check className="h-4 w-4 shrink-0 text-[#34D399]" aria-hidden="true" />
                {point.title}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-[#8CA0B8]">{point.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who it is for */}
      <section>
        <p className="text-[13px] font-medium tracking-wide text-[#3B82F6] uppercase">Who it serves</p>
        <h3 className="mt-2 text-[20px] font-bold text-[#E8EEF7]">
          Built for the people who have to decide.
        </h3>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {CUSTOMERS.map((customer) => {
            const Icon = customer.icon
            return (
              <div key={customer.title} className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#16233C]">
                    <Icon className="h-5 w-5 text-[#3B82F6]" aria-hidden="true" />
                  </span>
                  <p className="text-[16px] font-bold text-[#E8EEF7]">{customer.title}</p>
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-[#8CA0B8]">{customer.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Roadmap */}
      <section>
        <p className="text-[13px] font-medium tracking-wide text-[#3B82F6] uppercase">Roadmap</p>
        <h3 className="mt-2 text-[20px] font-bold text-[#E8EEF7]">Where this goes next.</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {ROADMAP.map((item) => (
            <div key={item.title} className="rounded-xl border border-[#1E2D47] bg-[#101A2E] p-5">
              <p
                className={`inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium ${
                  item.done ? 'bg-[#34D399]/15 text-[#34D399]' : 'bg-[#16233C] text-[#8CA0B8]'
                }`}
              >
                {item.phase}
              </p>
              <p className="mt-3 text-[16px] font-bold text-[#E8EEF7]">{item.title}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-[#8CA0B8]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Partner CTA */}
      <section className="rounded-2xl border border-[#1E2D47] bg-[#101A2E] p-6 md:p-8">
        <div className="flex items-start gap-4">
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6] sm:flex">
            <Siren className="h-6 w-6 text-white" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[20px] font-bold text-[#E8EEF7]">Pilot NE-SHIELD in your district.</h3>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#8CA0B8]">
              We are looking for pilot districts, department partners and supporters to take this
              from 20 zones to every vulnerable slope in the Northeast. See the system live first —
              then talk to us about bringing it to your region.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpenDashboard}
                className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#2563EB]"
              >
                Open the live dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href="https://github.com/technob7355-sys/NE-SHIELDE"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[#1E2D47] bg-[#16233C] px-5 py-3 text-[14px] font-medium text-[#E8EEF7] transition-colors hover:bg-[#1E2D47]"
              >
                Explore the code on GitHub
              </a>
            </div>
            <p className="mt-5 text-[12px] leading-relaxed text-[#8CA0B8]">
              NE-SHIELD is an advisory system. It supports — and never replaces — official warnings
              from disaster management authorities.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
