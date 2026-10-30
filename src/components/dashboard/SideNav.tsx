import {
  AlertTriangle,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  Map as MapIcon,
} from 'lucide-react'
import type { TabId } from '../types'

interface SideNavProps {
  activeTab: TabId
  alertCount: number
  onTab: (tab: TabId) => void
  onAlerts: () => void
}

const ITEMS: { id: TabId | 'alerts'; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'map', label: 'Risk Map', icon: MapIcon },
  { id: 'accuracy', label: 'Model Accuracy', icon: Gauge },
  { id: 'alerts', label: 'Alerts & Warnings', icon: AlertTriangle },
  { id: 'report', label: 'Report Hazard', icon: ClipboardList },
]

/** TerraGuard-style side navigation. Every item works — no dead buttons. */
export default function SideNav({ activeTab, alertCount, onTab, onAlerts }: SideNavProps) {
  return (
    <aside className="fixed top-16 bottom-0 left-0 z-40 hidden w-[232px] flex-col border-r border-[#1E2D47] bg-[#101A2E] md:flex">
      <nav className="flex flex-col gap-1 p-3" aria-label="Main">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.id === activeTab || (item.id === 'alerts' && activeTab === 'overview')
          const handleClick = () => {
            if (item.id === 'alerts') onAlerts()
            else onTab(item.id as TabId)
          }
          return (
            <button
              key={item.id}
              type="button"
              onClick={handleClick}
              aria-current={isActive && item.id !== 'alerts' ? 'page' : undefined}
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
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F87171] px-1.5 text-[10px] font-bold text-white">
                  {alertCount}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto p-3">
        <div className="overflow-hidden rounded-xl border border-[#1E2D47]">
          <div
            className="bg-cover bg-center p-4"
            style={{
              backgroundImage:
                'linear-gradient(160deg, rgba(11,18,32,0.55) 0%, rgba(11,18,32,0.92) 100%), linear-gradient(120deg, #16233C 0%, #0B1220 70%)',
            }}
          >
            <p className="text-[15px] leading-snug font-bold text-[#E8EEF7]">
              Predict Risks.
              <br />
              Protect Lives.
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#8CA0B8]">
              Live monitoring across 20 Northeast zones.
            </p>
          </div>
        </div>
        <p className="mt-3 px-1 text-[11px] text-[#8CA0B8]">v1.0.0</p>
      </div>
    </aside>
  )
}
