import {
  AlertTriangle,
  ClipboardList,
  History,
  LayoutDashboard,
  Map as MapIcon,
  UserCog,
} from 'lucide-react'
import type { TabId } from '../types'
import { DEMO_ROLES, setRole, useRole, type DemoRole } from '../../services/roles'

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
      {/* Demo role switcher — bottom of the desktop sidebar */}
      <div className="shrink-0 border-t border-[#d9d9d9] p-3">
        <RoleSwitcher variant="full" />
      </div>
    </aside>
  )
}

/**
 * DEMO role switcher — Citizen / Field Officer / Control-Room Operator.
 *
 * Frontend-only demo: it changes which buttons and sections are shown, it is
 * NOT authentication or access control. Real RBAC is enforced server-side —
 * see docs/auth-rbac-guide.md.
 */
export function RoleSwitcher({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const role = useRole()
  const pick = (r: DemoRole) => setRole(r)

  if (variant === 'compact') {
    return (
      <label className="flex shrink-0 items-center gap-1.5 text-[13px] text-[#64748B]">
        <UserCog className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">Demo role</span>
        <span aria-hidden="true">Demo&nbsp;role:</span>
        <select
          value={role}
          onChange={(e) => pick(e.target.value as DemoRole)}
          className="rounded-lg border border-[#CBD5E1] bg-white px-2 py-1.5 text-[13px] text-[#0F172A] focus:border-[#106EBE] focus:outline-none"
        >
          {DEMO_ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.short}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <fieldset>
      <legend className="flex items-center gap-1.5 px-3 pb-1.5 text-[12px] font-bold tracking-widest text-[#64748B] uppercase">
        <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
        Demo role
      </legend>
      <div className="flex flex-col gap-1" role="radiogroup" aria-label="Demo role">
        {DEMO_ROLES.map((r) => {
          const active = r.id === role
          return (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(r.id)}
              title={r.blurb}
              className={`rounded-lg px-3 py-2 text-left transition-all duration-200 active:scale-[0.98] ${
                active
                  ? 'bg-[#004F88] text-white'
                  : 'text-[#475569] hover:bg-[#e9e9e9]'
              }`}
            >
              <span className="block text-[14px] font-medium">{r.label}</span>
              <span
                className={`block text-[12px] leading-snug ${active ? 'text-white/75' : 'text-[#64748B]'}`}
              >
                {r.blurb}
              </span>
            </button>
          )
        })}
      </div>
      <p className="px-3 pt-2 text-[12px] leading-snug text-[#64748B]">
        Demo only — real access control is server-side (docs/auth-rbac-guide.md).
      </p>
    </fieldset>
  )
}
