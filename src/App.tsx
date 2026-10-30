import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ClipboardList,
  Gauge,
  Home,
  LayoutDashboard,
  Map as MapIcon,
  Shield,
} from 'lucide-react'
import { LOCATIONS } from './data/locations'
import { predictRisk } from './ml/model'
import { fetchZoneWeather } from './services/weather'
import ApiStatus from './components/ApiStatus'
import Landing from './components/Landing'
import Overview from './components/Overview'
import MapView from './components/MapView'
import AccuracyView from './components/AccuracyView'
import ReportView from './components/ReportView'
import ZoneDetail from './components/ZoneDetail'
import { ThemeToggle } from './theme'
import type { TabId, ZoneLocation, ZoneWeather, ZoneWithScore } from './components/types'
import { formatTimeWithSecondsIST } from './components/risk'

const TABS: { id: TabId; label: string; title: string; icon: typeof LayoutDashboard }[] = [
  { id: 'home', label: 'Home', title: 'Home', icon: Home },
  { id: 'overview', label: 'Overview', title: 'Overview', icon: LayoutDashboard },
  { id: 'map', label: 'Live Map', title: 'Live Map', icon: MapIcon },
  { id: 'accuracy', label: 'Accuracy', title: 'Model Accuracy', icon: Gauge },
  { id: 'report', label: 'Report Hazard', title: 'Report Hazard', icon: ClipboardList },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [tabDir, setTabDir] = useState<'fwd' | 'back'>('fwd')
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

  const [tabHistory, setTabHistory] = useState<TabId[]>([])

  const handleTabChange = useCallback(
    (tab: TabId) => {
      if (tab === activeTab) return
      const currentIdx = TABS.findIndex((t) => t.id === activeTab)
      const nextIdx = TABS.findIndex((t) => t.id === tab)
      setTabDir(nextIdx > currentIdx ? 'fwd' : 'back')
      const nextStack = [...tabHistory, activeTab]
      setTabHistory(nextStack)
      setActiveTab(tab)
      window.history.pushState({ tab, stack: nextStack }, '')
    },
    [activeTab, tabHistory],
  )

  const handleBack = useCallback(() => {
    if (tabHistory.length === 0) {
      setTabDir('back')
      setActiveTab('home')
      window.history.replaceState({ tab: 'home', stack: [] }, '')
      return
    }
    // The popstate handler below performs the actual navigation,
    // so the browser back button and this button stay in sync.
    window.history.back()
  }, [tabHistory])

  const activeTabRef = useRef<TabId>(activeTab)
  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  // Seed the first history entry, and restore tab + stack on browser back/forward.
  useEffect(() => {
    if (!window.history.state || !window.history.state.tab) {
      window.history.replaceState({ tab: 'home', stack: [] }, '')
    }
    const onPopState = (event: PopStateEvent) => {
      const state = event.state as { tab?: TabId; stack?: TabId[] } | null
      const nextTab = state?.tab ?? 'home'
      const currentIdx = TABS.findIndex((t) => t.id === activeTabRef.current)
      const nextIdx = TABS.findIndex((t) => t.id === nextTab)
      if (nextIdx !== currentIdx) {
        setTabDir(nextIdx > currentIdx ? 'fwd' : 'back')
      }
      setTabHistory(state?.stack ?? [])
      setActiveTab(nextTab)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
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
    `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-medium whitespace-nowrap transition-all duration-300 active:scale-[0.97] ${
      activeTab === tab ? 'bg-(--surface-2) text-(--text)' : 'text-(--muted) hover:bg-(--surface-2)'
    }`

  return (
    <div className="min-h-screen bg-(--bg) text-(--text)">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-(--border) bg-(--surface) md:flex">
        <button
          type="button"
          onClick={() => handleTabChange('home')}
          className="flex items-center gap-2.5 border-b border-(--border) px-5 py-5 text-left transition-all duration-300 hover:bg-(--surface-2) active:scale-[0.98]"
          aria-label="Go to home"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--accent)">
            <Shield className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[16px] font-bold text-(--text)">NE-SHIELD</span>
            <span className="block truncate text-[12px] text-(--muted)">Landslide Early Warning</span>
          </span>
        </button>
        <nav className="flex flex-col gap-1 p-3" aria-label="Main">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={navButtonClass(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${activeTab === tab.id ? 'text-(--accent)' : 'text-(--muted)'}`}
                  aria-hidden="true"
                />
                {tab.label}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto border-t border-(--border) p-5">
          <p className="text-[12px] leading-relaxed text-(--muted)">
            Live weather: Open-Meteo • 20 zones, Northeast India
          </p>
        </div>
      </aside>

      <div className="md:pl-[232px]">
        <div className="border-b border-(--border) bg-(--surface) md:hidden">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <button
              type="button"
              onClick={() => handleTabChange('home')}
              className="flex shrink-0 items-center gap-2.5 transition-all duration-300 active:scale-[0.97]"
              aria-label="Go to home"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--accent)">
                <Shield className="h-4 w-4 text-white" aria-hidden="true" />
              </span>
              <span className="truncate text-[16px] font-bold text-(--text)">NE-SHIELD</span>
            </button>
            <span className="ml-auto md:hidden">
              <ThemeToggle />
            </span>
            <span className="shrink-0 text-[13px] whitespace-nowrap text-(--muted)">
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
                  onClick={() => handleTabChange(tab.id)}
                  className={navButtonClass(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${activeTab === tab.id ? 'text-(--accent)' : 'text-(--muted)'}`}
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
            <div className="flex min-w-0 items-start gap-3">
              {activeTab !== 'home' ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-(--border) bg-(--surface-2) px-3 py-1.5 text-[13px] font-medium text-(--text) transition-all duration-300 hover:bg-(--border) active:scale-[0.95]"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </button>
              ) : null}
              <div className="min-w-0">
                <h1 key={activeTab} className="title-in text-[20px] font-bold text-(--text)">
                  {activeTabMeta.title}
                </h1>
                <p className="mt-0.5 hidden text-[13px] whitespace-nowrap text-(--muted) md:block">
                  {clockText}
                </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="hidden md:inline-flex">
                <ThemeToggle />
              </span>
              <ApiStatus />
            </div>
          </div>

          <div key={activeTab} className={tabDir === 'fwd' ? 'tab-in-fwd' : 'tab-in-back'}>
            {activeTab === 'home' ? (
              <Landing
                zones={zones}
                loading={loading}
                onOpenDashboard={() => handleTabChange('overview')}
                onOpenAccuracy={() => handleTabChange('accuracy')}
                onOpenMap={() => handleTabChange('map')}
              />
            ) : null}
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
          </div>
        </main>

        {panelZone ? (
          <aside
            aria-hidden={!panelOpen}
            className="sticky top-0 h-screen shrink-0 overflow-hidden bg-(--surface) transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-[1200] max-md:h-full max-md:shadow-2xl"
            style={{
              width: panelOpen ? 'min(380px, 92vw)' : '0px',
              borderLeft: panelOpen ? '1px solid var(--border)' : '1px solid transparent',
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
