import {
  AlertTriangle,
  ClipboardList,
  History,
  Home,
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
    label: 'Operations',
    items: [{ id: 'report', label: 'Report Hazard', icon: ClipboardList }],
  },
]

/** Grouped side navigation. Every item works — no dead buttons. */
export default function SideNav({ activeTab, alertCount, onTab }: SideNavProps) {
  return (
    <aside className="fixed top-16 bottom-0 left-0 z-40 hidden w-[232px] flex-col border-r border-[#d9d9d9] bg-white md:flex">
      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3" aria-label="Main">
        <div>
          <button
            type="button"
            onClick={() => onTab('home')}
            aria-current={activeTab === 'home' ? 'page' : undefined}
            className={`flex w-full shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14px] font-medium whitespace-nowrap transition-all duration-300 active:scale-[0.97] ${
              activeTab === 'home' ? 'bg-[#106ebe]/10 font-semibold text-[#004f88]' : 'text-[#475569] hover:bg-[#e9e9e9]'
            }`}
          >
            <Home
              className={`h-4 w-4 shrink-0 ${activeTab === 'home' ? 'text-[#004f88]' : 'text-[#64748B]'}`}
              aria-hidden="true"
            />
            <span className="flex-1 text-left">Homepage</span>
          </button>
        </div>
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[12px] font-bold tracking-widest text-[#64748B] uppercase">
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
                      isActive ? 'bg-[#106ebe]/10 font-semibold text-[#004f88]' : 'text-[#475569] hover:bg-[#e9e9e9]'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#004f88]' : 'text-[#64748B]'}`}
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
    </aside>
  )
}
