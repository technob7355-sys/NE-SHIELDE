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
import { predictForecast, predictRisk } from './ml/model'
import { fetchZoneWeather } from './services/weather'
import { buildAlerts } from './services/alerts'
import Landing from './components/Landing'
import MapView from './components/MapView'
import AccuracyView from './components/AccuracyView'
import ReportView from './components/ReportView'
import ZoneDetail from './components/ZoneDetail'
import TopBar from './components/dashboard/TopBar'
import SideNav from './components/dashboard/SideNav'
import OverviewDashboard from './components/dashboard/OverviewDashboard'
import type { TabId, ZoneLocation, ZoneWeather, ZoneWithScore } from './components/types'
import { formatTimeIST, formatTimeWithSecondsIST } from './components/risk'

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
        outlook: null,
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
            let outlook: ZoneWithScore['outlook'] = null
            try {
              outlook = predictForecast(
                weather.history,
                weather.forecast,
                location.slope,
              ) as unknown as ZoneWithScore['outlook']
            } catch {
              outlook = null
            }
            return { location, weather, prediction, outlook, error: null }
          } catch {
            return { location, weather, prediction: null, outlook: null, error: 'Prediction failed' }
          }
        }
        return {
          location,
          weather: null,
          prediction: null,
          outlook: null,
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

  const handleSelectZoneId = useCallback(
    (zoneId: string) => {
      const zone = zones.find((z) => z.location.id === zoneId)
      if (zone) handleSelectZone(zone)
    },
    [zones, handleSelectZone],
  )

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

  const goToAlerts = useCallback(() => {
    if (activeTab !== 'overview') handleTabChange('overview')
    window.setTimeout(() => {
      document.getElementById('alerts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 350)
  }, [activeTab, handleTabChange])

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

  const alerts = useMemo(() => buildAlerts(zones), [zones])

  const focusZone = useMemo(() => {
    if (selectedZone) return selectedZone
    const scored = zones.filter((z) => z.prediction)
    return (
      [...scored].sort((a, b) => (b.prediction?.score ?? 0) - (a.prediction?.score ?? 0))[0] ?? null
    )
  }, [selectedZone, zones])

  const lastUpdated = useMemo(() => {
    const t = zones
      .map((z) => z.weather?.fetchedAt)
      .filter((v): v is string => Boolean(v))
      .sort()
      .at(-1)
    return t ? `${formatTimeIST(t)} IST` : '—'
  }, [zones])

  const avgTempC = useMemo(() => {
    const temps = zones
      .map((z) => z.weather?.currentTempC)
      .filter((v): v is number => v != null)
    return temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null
  }, [zones])

  const condition = useMemo(() => {
    const maxRain = Math.max(0, ...zones.map((z) => z.weather?.rainfall ?? 0))
    if (maxRain > 50) return 'Heavy Rain'
    if (maxRain > 10) return 'Rain'
    if (maxRain > 0.5) return 'Light Rain'
    return 'Clear'
  }, [zones])

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
      activeTab === tab ? 'bg-[#16233C] text-[#E8EEF7]' : 'text-[#8CA0B8] hover:bg-[#16233C]'
    }`

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E8EEF7]">
      <TopBar
        lastUpdated={lastUpdated}
        avgTempC={avgTempC}
        condition={condition}
        alertCount={alerts.length}
        onAlertsClick={goToAlerts}
        onHome={() => handleTabChange('home')}
      />
      <SideNav
        activeTab={activeTab}
        alertCount={alerts.length}
        onTab={handleTabChange}
        onAlerts={goToAlerts}
      />

      <div className="md:pl-[232px] md:pt-16">
        <div className="border-b border-[#1E2D47] bg-[#101A2E] md:hidden">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <button
              type="button"
              onClick={() => handleTabChange('home')}
              className="flex shrink-0 items-center gap-2.5 transition-all duration-300 active:scale-[0.97]"
              aria-label="Go to home"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6]">
                <Shield className="h-4 w-4 text-white" aria-hidden="true" />
              </span>
              <span className="truncate text-[16px] font-bold text-[#E8EEF7]">NE-SHIELD</span>
            </button>
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
                  onClick={() => handleTabChange(tab.id)}
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
          <main className="min-w-0 flex-1 p-4 md:p-6">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
              <div className="flex min-w-0 items-start gap-3">
                {activeTab !== 'home' ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#1E2D47] bg-[#16233C] px-3 py-1.5 text-[13px] font-medium text-[#E8EEF7] transition-all duration-300 hover:bg-[#1E2D47] active:scale-[0.95]"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back
                  </button>
                ) : null}
                <div className="min-w-0">
                  <h1 key={activeTab} className="title-in text-[20px] font-bold text-[#E8EEF7]">
                    {activeTabMeta.title}
                  </h1>
                </div>
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
                <OverviewDashboard
                  zones={zones}
                  loading={loading}
                  alerts={alerts}
                  selectedZone={selectedZone}
                  onSelectZone={handleSelectZone}
                  onSelectZoneId={handleSelectZoneId}
                  onDeselectZone={handleClosePanel}
                  onOpenMap={() => {
                    if (focusZone) handleSelectZone(focusZone)
                    handleTabChange('map')
                  }}
                />
              ) : null}
              {activeTab === 'map' ? (
                <MapView
                  zones={zones}
                  loading={loading}
                  onSelectZone={handleSelectZone}
                  onDeselectZone={handleClosePanel}
                  selectedZone={selectedZone}
                />
              ) : null}
              {activeTab === 'accuracy' ? <AccuracyView /> : null}
              {activeTab === 'report' ? <ReportView /> : null}
            </div>
          </main>

          {panelZone && activeTab !== 'overview' ? (
            <aside
              aria-hidden={!panelOpen}
              className="sticky top-0 h-screen shrink-0 overflow-hidden bg-[#101A2E] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:top-16 md:h-[calc(100vh-4rem)] max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-[1200] max-md:h-full max-md:shadow-2xl"
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
