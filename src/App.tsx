import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Gauge, LayoutDashboard, Map as MapIcon, Shield } from 'lucide-react'
import { LOCATIONS } from './data/locations'
import { predictRisk } from './ml/model'
import { fetchZoneWeather } from './services/weather'
import ApiStatus from './components/ApiStatus'
import Overview from './components/Overview'
import MapView from './components/MapView'
import AccuracyView from './components/AccuracyView'
import ReportView from './components/ReportView'
import ZoneDetail from './components/ZoneDetail'
import type { TabId, ZoneLocation, ZoneWeather, ZoneWithScore } from './components/types'
import { formatTimeWithSecondsIST } from './components/risk'

const TABS: { id: TabId; label: string; title: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', title: 'Overview', icon: LayoutDashboard },
  { id: 'map', label: 'Live Map', title: 'Live Map', icon: MapIcon },
  { id: 'accuracy', label: 'Accuracy', title: 'Model Accuracy', icon: Gauge },
  { id: 'report', label: 'Report Hazard', title: 'Report Hazard', icon: ClipboardList },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [zones, setZones] = useState<ZoneWithScore[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const locations = LOCATIONS as unknown as ZoneLocation[]
      const initial: ZoneWithScore[] = locations.map((location) => ({
        location,
        weather: null,
        prediction: null,
        error: null,
      }))
      if (!cancelled) setZones(initial)

      const results = await Promise.allSettled(
        locations.map((loc) =>
          (fetchZoneWeather as unknown as (l: ZoneLocation) => Promise<ZoneWeather>)(loc),
        ),
      )
      if (cancelled) return
      const next: ZoneWithScore[] = locations.map((location, i) => {
        const result = results[i]
        if (result.status === 'fulfilled') {
          const weather = result.value
          try {
            const prediction = predictRisk({
              rainfall: weather.rainfall,
              rainfall3d: weather.rainfall3d,
              rainfall30d: weather.rainfall30d,
              soilMoisture: weather.soilMoisture,
              slope: location.slope,
            }) as unknown as ZoneWithScore['prediction']
            return { location, weather, prediction, error: null }
          } catch {
            return { location, weather, prediction: null, error: 'Prediction failed' }
          }
        }
        return {
          location,
          weather: null,
          prediction: null,
          error: result.reason instanceof Error ? result.reason.message : 'Data unavailable',
        }
      })
      setZones(next)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSelectZone = useCallback((zone: ZoneWithScore) => {
    setSelectedId(zone.location.id)
  }, [])

  const selectedZone = useMemo(
    () => zones.find((z) => z.location.id === selectedId) ?? null,
    [zones, selectedId],
  )

  const activeTabMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0]
  const clockText = `${formatTimeWithSecondsIST(now.toISOString())} IST`

  const navButtonClass = (tab: TabId) =>
    `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-medium whitespace-nowrap ${
      activeTab === tab ? 'bg-[#16233C] text-[#E8EEF7]' : 'text-[#8CA0B8] hover:bg-[#16233C]'
    }`

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E8EEF7]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-[#1E2D47] bg-[#101A2E] md:flex">
        <div className="flex items-center gap-2.5 border-b border-[#1E2D47] px-5 py-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6]">
            <Shield className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[16px] font-bold text-[#E8EEF7]">NE-SHIELD</span>
            <span className="block truncate text-[12px] text-[#8CA0B8]">Landslide Early Warning</span>
          </span>
        </div>
        <nav className="flex flex-col gap-1 p-3" aria-label="Main">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={navButtonClass(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${activeTab === tab.id ? 'text-[#3B82F6]' : 'text-[#8CA0B8]'}`}
                  aria-hidden="true"
                />
                {tab.label}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto border-t border-[#1E2D47] p-5">
          <p className="text-[12px] leading-relaxed text-[#8CA0B8]">
            Live weather: Open-Meteo • 20 zones, Northeast India
          </p>
        </div>
      </aside>

      <div className="md:pl-[232px]">
        <div className="border-b border-[#1E2D47] bg-[#101A2E] md:hidden">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6]">
              <Shield className="h-4 w-4 text-white" aria-hidden="true" />
            </span>
            <span className="truncate text-[16px] font-bold text-[#E8EEF7]">NE-SHIELD</span>
            <span className="ml-auto shrink-0 text-[13px] whitespace-nowrap text-[#8CA0B8]">
              {clockText}
            </span>
          </div>
          <nav
            className="flex gap-1 overflow-x-auto px-3 pb-3 whitespace-nowrap"
            aria-label="Main mobile"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={navButtonClass(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${activeTab === tab.id ? 'text-[#3B82F6]' : 'text-[#8CA0B8]'}`}
                    aria-hidden="true"
                  />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <main className="p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <h1 className="text-[20px] font-bold text-[#E8EEF7]">{activeTabMeta.title}</h1>
              <p className="mt-0.5 hidden text-[13px] whitespace-nowrap text-[#8CA0B8] md:block">
                {clockText}
              </p>
            </div>
            <div className="min-w-0">
              <ApiStatus />
            </div>
          </div>

          {activeTab === 'overview' ? (
            <Overview zones={zones} loading={loading} onSelectZone={handleSelectZone} />
          ) : null}
          {activeTab === 'map' ? (
            <MapView zones={zones} loading={loading} onSelectZone={handleSelectZone} />
          ) : null}
          {activeTab === 'accuracy' ? <AccuracyView /> : null}
          {activeTab === 'report' ? <ReportView /> : null}
        </main>
      </div>

      {selectedZone ? (
        <ZoneDetail zone={selectedZone} onClose={() => setSelectedId(null)} />
      ) : null}
    </div>
  )
}
