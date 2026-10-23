import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const [panelZone, setPanelZone] = useState<ZoneWithScore | null>(null)
  const closeTimer = useRef<number | undefined>(undefined)
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

  const panelOpen = selectedZone !== null

  useEffect(() => {
    if (selectedZone) {
      window.clearTimeout(closeTimer.current)
      setPanelZone(selectedZone)
    }
  }, [selectedZone])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const handleClosePanel = useCallback(() => {
    setSelectedId(null)
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setPanelZone(null), 560)
  }, [])

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

        <div className="flex items-start">
        <main className="min-w-0 flex-1 p-6">
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
            <MapView
              zones={zones}
              loading={loading}
              onSelectZone={handleSelectZone}
              selectedZone={selectedZone}
            />
          ) : null}
          {activeTab === 'accuracy' ? <AccuracyView /> : null}
          {activeTab === 'report' ? <ReportView /> : null}
        </main>

        {panelZone ? (
          <aside
            aria-hidden={!panelOpen}
            className="sticky top-0 h-screen shrink-0 overflow-hidden bg-[#101A2E] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-[1200] max-md:h-full max-md:shadow-2xl"
            style={{
              width: panelOpen ? 'min(380px, 92vw)' : '0px',
              borderLeft: panelOpen ? '1px solid #1E2D47' : '1px solid transparent',
            }}
          >
            <div
              key={panelZone.location.id}
              className="panel-content-in flex h-full w-[380px] max-w-[92vw] flex-col transition-opacity duration-500"
              style={{ opacity: panelOpen ? 1 : 0 }}
            >
              <ZoneDetail zone={panelZone} onClose={handleClosePanel} />
            </div>
          </aside>
        ) : null}
        </div>
      </div>
    </div>
  )
}
