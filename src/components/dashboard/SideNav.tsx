import {
  AlertTriangle,
  ClipboardList,
  FlaskConical,
  Gauge,
  History,
  LayoutDashboard,
  Map as MapIcon,
} from 'lucide-react'
import type { TabId } from '../types'

interface SideNavProps {
  activeTab: TabId
  alertCount: number
  onTab: (tab: TabId) => void
}

const GROUPS: { label: string; items: { id: TabId; label: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    label: 'Monitoring',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'map', label: 'Risk Map', icon: MapIcon },
      { id: 'alerts', label: 'Alerts & Warnings', icon: AlertTriangle },
      { id: 'history', label: 'History', icon: History },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { id: 'accuracy', label: 'Model Accuracy', icon: Gauge },
      { id: 'technical', label: 'Technical Evaluation', icon: FlaskConical },
    ],
  },
  {
    label: 'Operations',
    items: [{ id: 'report', label: 'Report Hazard', icon: ClipboardList }],
  },
]

/** Grouped side navigation. Every item works — no dead buttons. */
export default function SideNav({ activeTab, alertCount, onTab }: SideNavProps) {
  return (
    <aside className="fixed top-16 bottom-0 left-0 z-40 hidden w-[232px] flex-col border-r border-[#1E2D47] bg-[#101A2E] md:flex">
      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3" aria-label="Main">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[12px] font-bold tracking-widest text-[#8CA0B8] uppercase">
              {group.label}
            </p>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = item.id === activeTab
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14px] font-medium whitespace-nowrap transition-all duration-300 active:scale-[0.97] ${
                      isActive ? 'bg-[#16233C] text-[#E8EEF7]' : 'text-[#8CA0B8] hover:bg-[#16233C]'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#3B82F6]' : 'text-[#8CA0B8]'}`}
                      aria-hidden="true"
                    />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.id === 'alerts' && alertCount > 0 ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F87171] px-1.5 text-[12px] font-bold text-white">
                        {alertCount}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto shrink-0 p-3">
        <div className="overflow-hidden rounded-xl border border-[#1E2D47]">
          <div
            className="bg-cover bg-center p-4"
            style={{
              backgroundImage:
                'linear-gradient(160deg, rgba(11,18,32,0.55) 0%, rgba(11,18,32,0.92) 100%), linear-gradient(120deg, #16233C 0%, #0B1220 70%)',
            }}
          >
            <p className="text-[16px] leading-snug font-bold text-[#E8EEF7]">
              Predict Risks.
              <br />
              Protect Lives.
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#8CA0B8]">
              Live monitoring across 20 Northeast zones.
            </p>
          </div>
        </div>
        <p className="mt-3 px-1 text-[12px] text-[#8CA0B8]">v1.0.0</p>
      </div>
    </aside>
  )
}
