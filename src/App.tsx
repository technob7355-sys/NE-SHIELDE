import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  History,
  Home,
  LayoutDashboard,
  Map as MapIcon,
  Shield,
} from 'lucide-react'
import { LOCATIONS } from './data/locations'
import { predictForecast, predictRisk } from './ml/model'
import { fetchZoneWeather } from './services/weather'
import { buildAlerts } from './services/alerts'
import { feedState } from './services/dataQuality'
import {
  NOTIF_CONFIG,
  commitTriggers,
  computeTriggers,
  hazardReportNotification,
  loadNotifications,
  loadSnapshot,
  markAllRead,
  markRead,
  unreadCount,
  type Notification,
} from './services/notifications'
import { setStatus as setLifecycleStatus } from './services/alertStore'
import type { HazardReport } from './services/reports'
import ApiStatus from './components/ApiStatus'
import Landing from './components/Landing'
import MapView from './components/MapView'
import HistoricalExplorer from './components/HistoricalExplorer'
import ReportView from './components/ReportView'
import ZoneDetail from './components/ZoneDetail'
import TopBar from './components/dashboard/TopBar'
import SideNav from './components/dashboard/SideNav'
import OverviewDashboard from './components/dashboard/OverviewDashboard'
import AlertsPanel from './components/dashboard/AlertsPanel'
import Incidents from './components/Incidents'
import type { TabId, ZoneLocation, ZoneWeather, ZoneWithScore } from './components/types'
import { formatTimeIST, formatTimeWithSecondsIST } from './components/risk'

const TABS: { id: TabId; label: string; title: string; icon: typeof LayoutDashboard }[] = [
  { id: 'home', label: 'Home', title: 'Home', icon: Home },
  { id: 'overview', label: 'Overview', title: 'Overview', icon: LayoutDashboard },
  { id: 'map', label: 'Live Map', title: 'Live Map', icon: MapIcon },
  { id: 'alerts', label: 'Alerts', title: 'Alerts & Warnings', icon: AlertTriangle },
  { id: 'history', label: 'History', title: 'Historical Events', icon: History },
  { id: 'report', label: 'Report Hazard', title: 'Report Hazard', icon: ClipboardList },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [tabDir, setTabDir] = useState<'fwd' | 'back'>('fwd')
  const [zones, setZones] = useState<ZoneWithScore[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelZone, setPanelZone] = useState<ZoneWithScore | null>(null)
  // Drives the slide-in/out CSS classes; the last zone stays mounted for the
  // 300ms exit animation, then panelZone is cleared (unmounted).
  const [panelVisible, setPanelVisible] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const [now, setNow] = useState(() => new Date())

  // ---- Notifications (per-browser; computed on the polling cycle) ----
  const [notifications, setNotifications] = useState<Notification[]>(() => loadNotifications())
  const notificationsRef = useRef<Notification[]>(notifications)
  const snapshotRef = useRef(loadSnapshot())
  useEffect(() => {
    notificationsRef.current = notifications
  }, [notifications])

  const runTriggers = useCallback((next: ZoneWithScore[]) => {
    const prev = notificationsRef.current
    const { notifications: fresh, snapshot } = computeTriggers(next, snapshotRef.current, prev)
    snapshotRef.current = snapshot
    const merged = commitTriggers(fresh, snapshot, prev)
    notificationsRef.current = merged
    setNotifications(merged)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadZones = useCallback(async () => {
    const locations = LOCATIONS as unknown as ZoneLocation[]
    const initial: ZoneWithScore[] = locations.map((location) => ({
      location,
      weather: null,
      prediction: null,
      outlook: null,
      error: null,
    }))
    setZones(initial)

    const results = await Promise.allSettled(
      locations.map((loc) =>
        (fetchZoneWeather as unknown as (l: ZoneLocation) => Promise<ZoneWeather>)(loc),
      ),
    )
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
    runTriggers(next)
  }, [runTriggers])

  useEffect(() => {
    setLoading(true)
    void loadZones()
  }, [loadZones])

  // Polling cycle for fresh data + notification triggers. Paused while the
  // tab is hidden. Documented delivery mechanism (no push/WebSocket).
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return
      void loadZones()
    }, NOTIF_CONFIG.POLL_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [loadZones])

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
      // Moving to another tab dismisses the zone panel (it slides out).
      setSelectedId(null)
      setActiveTab(tab)
      window.scrollTo(0, 0)
      window.history.pushState({ tab, stack: nextStack }, '')
    },
    [activeTab, tabHistory],
  )

  const goToAlerts = useCallback(() => {
    handleTabChange('alerts')
  }, [handleTabChange])

  // ---- Notification actions (per-browser) ----
  const handleMarkRead = useCallback((id: string) => {
    const next = markRead(id)
    notificationsRef.current = next
    setNotifications(next)
  }, [])

  const handleMarkAllRead = useCallback(() => {
    const next = markAllRead()
    notificationsRef.current = next
    setNotifications(next)
  }, [])

  const handleOpenLocation = useCallback(
    (zoneId: string) => {
      const zone = zones.find((z) => z.location.id === zoneId)
      if (!zone) return
      handleTabChange('map')
      handleSelectZone(zone)
    },
    [zones, handleTabChange, handleSelectZone],
  )

  const handleReportSubmitted = useCallback((report: HazardReport) => {
    setLifecycleStatus(report.id, 'pending_verification', 'Report submitted')
    const n = hazardReportNotification(report)
    const prev = notificationsRef.current
    const merged = [n, ...prev].slice(0, 100)
    notificationsRef.current = merged
    try {
      localStorage.setItem('ne_shield_notifications_v1', JSON.stringify(merged))
    } catch {
      /* session-only */
    }
    setNotifications(merged)
  }, [])

  const handleBack = useCallback(() => {
    if (tabHistory.length === 0) {
      setTabDir('back')
      setSelectedId(null)
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
      // Browser back/forward is also a tab change — dismiss the zone panel.
      setSelectedId(null)
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

  // Slide the zone panel in on selection; on close (X, empty map tap, tab
  // change) slide it out over 300ms, then unmount.
  useEffect(() => {
    if (selectedZone) {
      window.clearTimeout(closeTimer.current)
      setPanelZone(selectedZone)
      // Mount first in the hidden state, then flip to visible on the next
      // frames so the slide-in transition actually plays.
      const raf = window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => setPanelVisible(true)),
      )
      return () => window.cancelAnimationFrame(raf)
    }
    setPanelVisible(false)
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setPanelZone(null), 300)
    return () => window.clearTimeout(closeTimer.current)
  }, [selectedZone])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const handleClosePanel = useCallback(() => {
    setSelectedId(null)
  }, [])

  const handleDeselectZone = useCallback(() => {
    setSelectedId(null)
  }, [])

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

  const activeTabMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0]
  const clockText = `${formatTimeWithSecondsIST(now.toISOString())} IST`

  const navButtonClass = (tab: TabId) =>
    `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-medium whitespace-nowrap transition-all duration-300 active:scale-[0.97] ${
      activeTab === tab ? 'bg-[#106EBE]/10 font-semibold text-[#004F88]' : 'text-[#64748B] hover:bg-[#D9D9D9]'
    }`

  return (
    <div className="min-h-screen bg-[#F0F0F0] text-[#0F172A]">
      <TopBar
        lastUpdated={lastUpdated}
        feedState={feedState(zones)}
        notifications={notifications}
        unread={unreadCount(notifications)}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onOpenLocation={handleOpenLocation}
        onViewAllAlerts={goToAlerts}
        onHome={() => handleTabChange('home')}
      />
      <SideNav
        activeTab={activeTab}
        alertCount={alerts.length}
        onTab={handleTabChange}
      />

      <div className="md:pl-[232px] md:pt-16">
        <div className="border-b border-[#D9D9D9] bg-white md:hidden">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <button
              type="button"
              onClick={() => handleTabChange('home')}
              className="flex shrink-0 items-center gap-2.5 transition-all duration-300 active:scale-[0.97]"
              aria-label="Go to home"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#106EBE]">
                <Shield className="h-4 w-4 text-white" aria-hidden="true" />
              </span>
              <span className="text-[17px] font-bold whitespace-nowrap text-[#0F172A]">NE-SHIELD</span>
            </button>
            <span className="ml-auto shrink-0 text-[14px] whitespace-nowrap text-[#64748B]">
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
                    className={`h-4 w-4 shrink-0 ${activeTab === tab.id ? 'text-[#004F88]' : 'text-[#64748B]'}`}
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
                {activeTab !== 'home' && tabHistory.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#D9D9D9] bg-[#E9E9E9] px-3 py-1.5 text-[14px] font-medium text-[#0F172A] transition-all duration-300 hover:bg-[#D9D9D9] active:scale-[0.95]"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back
                  </button>
                ) : null}
                <div className="min-w-0">
                  <h1 key={activeTab} className="title-in text-[22px] font-bold text-[#0F172A]">
                    {activeTabMeta.title}
                  </h1>
                </div>
              </div>
              <div className="min-w-0">
                <ApiStatus />
              </div>
            </div>

            <div key={activeTab} className={tabDir === 'fwd' ? 'tab-in-fwd' : 'tab-in-back'}>
              {activeTab === 'home' ? (
                <Landing
                  zones={zones}
                  loading={loading}
                  alerts={alerts}
                  notifications={notifications}
                  onOpenDashboard={() => handleTabChange('overview')}
                  onOpenMap={() => handleTabChange('map')}
                  onOpenAlerts={() => handleTabChange('alerts')}
                  onOpenHistory={() => handleTabChange('history')}
                />
              ) : null}
              {activeTab === 'overview' ? (
                <OverviewDashboard
                  zones={zones}
                  loading={loading}
                  focusZone={focusZone}
                  alerts={alerts}
                  onSelectZone={handleSelectZone}
                  onDeselectZone={handleDeselectZone}
                  onOpenMap={() => {
                    handleTabChange('map')
                    if (focusZone) handleSelectZone(focusZone)
                  }}
                />
              ) : null}
              {activeTab === 'map' ? (
                <MapView
                  zones={zones}
                  loading={loading}
                  onSelectZone={handleSelectZone}
                  onDeselectZone={handleDeselectZone}
                  selectedZone={selectedZone}
                />
              ) : null}
              {activeTab === 'history' ? <HistoricalExplorer /> : null}
              {activeTab === 'alerts' ? (
                <div className="flex flex-col gap-5">
                  <AlertsPanel alerts={alerts} zones={zones} onSelectZone={handleSelectZoneId} />
                  <Incidents alerts={alerts} zones={zones} />
                </div>
              ) : null}
              {activeTab === 'report' ? (
                <ReportView onReportSubmitted={handleReportSubmitted} />
              ) : null}
            </div>
          </main>

          {panelZone ? (
            <aside
              aria-hidden={!panelVisible}
              className={`sticky top-0 h-screen w-[min(380px,92vw)] shrink-0 overflow-hidden bg-white transition-all duration-300 ease-out md:top-16 md:h-[calc(100vh-4rem)] max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-[1200] max-md:h-full max-md:shadow-2xl ${
                panelVisible
                  ? 'translate-x-0 opacity-100'
                  : 'pointer-events-none translate-x-full opacity-0'
              }`}
              style={{ borderLeft: '1px solid #D9D9D9' }}
            >
              <div
                key={panelZone.location.id}
                className="panel-content-in flex h-full w-full flex-col"
              >
                <ZoneDetail
                  zone={panelZone}
                  alerts={alerts.filter((a) => a.zoneId === panelZone.location.id)}
                  onClose={handleClosePanel}
                />
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  )
}
