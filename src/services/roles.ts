import { useEffect, useState } from 'react'

/**
 * FRONTEND-ONLY DEMO ROLE SWITCHER.
 *
 * This is a display/demo convenience, not access control. Anyone can flip it.
 * Real RBAC (server-issued tokens, role enforcement on every API route,
 * audit logging) is specified in docs/auth-rbac-guide.md — see that spec for
 * the production design. Nothing here gates a backend, because there is none.
 */
export type DemoRole = 'citizen' | 'field' | 'operator'

export const DEMO_ROLES: {
  id: DemoRole
  label: string
  short: string
  blurb: string
}[] = [
  {
    id: 'citizen',
    label: 'Citizen',
    short: 'Citizen',
    blurb: 'Public info, report form, own reports, safety info.',
  },
  {
    id: 'field',
    label: 'Field Officer',
    short: 'Field Officer',
    blurb: 'Citizen view + incident tracking & notes. No status verdicts.',
  },
  {
    id: 'operator',
    label: 'Control-Room Operator',
    short: 'Operator',
    blurb: 'Full operator view: alert actions, report review, incidents.',
  },
]

const ROLE_KEY = 'ne_shield_demo_role_v1'
const ROLE_EVENT = 'ne_shield_role_change'

export function getRole(): DemoRole {
  try {
    const raw = localStorage.getItem(ROLE_KEY)
    if (raw === 'citizen' || raw === 'field' || raw === 'operator') return raw
  } catch {
    /* session-only default */
  }
  return 'citizen'
}

export function setRole(role: DemoRole): void {
  try {
    localStorage.setItem(ROLE_KEY, role)
  } catch {
    /* session-only */
  }
  window.dispatchEvent(new CustomEvent<DemoRole>(ROLE_EVENT, { detail: role }))
}

/** React hook — re-renders every consumer when the demo role changes. */
export function useRole(): DemoRole {
  const [role, setRoleState] = useState<DemoRole>(() => getRole())
  useEffect(() => {
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<DemoRole>).detail
      if (next) setRoleState(next)
      else setRoleState(getRole())
    }
    window.addEventListener(ROLE_EVENT, onChange)
    return () => window.removeEventListener(ROLE_EVENT, onChange)
  }, [])
  return role
}

/* ---- Permission helpers (demo gating only) ---- */

/** Acknowledge / investigate / resolve model alerts. */
export function canAckAlerts(role: DemoRole): boolean {
  return role === 'operator'
}

/** Move hazard reports through the review workflow (verify / reject / etc.). */
export function canReviewReports(role: DemoRole): boolean {
  return role === 'operator'
}

/** Create incidents and add notes to them. */
export function canWorkIncidents(role: DemoRole): boolean {
  return role === 'field' || role === 'operator'
}

/** Assign incidents / change incident status. */
export function canManageIncidents(role: DemoRole): boolean {
  return role === 'operator'
}

/** Show the incidents section at all. */
export function canSeeIncidents(role: DemoRole): boolean {
  return role === 'field' || role === 'operator'
}

/** Show alert acknowledge buttons in the alert UI. */
export function canSeeAlertActions(role: DemoRole): boolean {
  return role === 'operator'
}
