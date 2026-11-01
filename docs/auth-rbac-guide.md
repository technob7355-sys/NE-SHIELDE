# NE-SHIELD Auth & RBAC Guide

> **STATUS: PARTIALLY IMPLEMENTED — the frontend demo switcher exists; real
> enforcement does NOT.** There is no auth server, no password, no session.
> Everything below marked "backend must" is spec for the future backend in
> `backend-api-spec.md`. The demo role switcher is a UI affordance only.

## Roles

| Role | Intended for | Can do |
|---|---|---|
| `viewer` | Observers, public partners | Read dashboards, maps, history, reports list. Cannot change anything. |
| `operator` | Control-room staff | Everything viewer can, plus: acknowledge/escalate/resolve alerts, verify hazard reports, open and work incidents, submit reports. |
| `admin` | System administrators | Everything operator can, plus: manage operator accounts, rotate ingestion keys, change thresholds (with audit), view audit log. |

Role hierarchy is strict: `viewer` < `operator` < `admin`. Higher roles inherit
lower permissions; there is no "super" bypass — admins are still audited.

## What the frontend demo does (today)

- A **demo-only role switcher** changes which UI affordances are shown (e.g.
  action buttons hidden for viewer). It is implemented in browser state.
- It provides **zero security**: anyone can open devtools and call the same
  functions. It exists so stakeholders can preview role-based views during the
  expo/demo, nothing more.
- The switcher must be visually labeled as demo (e.g. "Demo role — not enforced").
- Hazard reports and alerts created in the demo live in per-browser
  localStorage and are **not shared** between operators or devices.

## What the backend must enforce (when built)

1. **Authenticate every request** (except `/api/healthz`, `/api/auth/login`).
   JWT in httpOnly cookie; 15-min access + 7-day rotating refresh.
2. **Authorize every mutation**: role claim re-checked against the DB per
   request. Never trust a role sent by the client.
   - `POST /api/alerts/:id/transition` → `operator` or `admin`
   - `POST /api/hazard-reports/:id/verify` → `operator` or `admin`
   - `POST /api/incidents`, `PATCH /api/incidents/:id` → `operator` or `admin`
   - Operator management, key rotation, threshold changes → `admin` only
3. **Audit everything**: each transition/verification/login writes to
   `audit_log` with operator id, timestamp, before/after state.
4. **Passwords**: argon2id, lockout after 10 failed attempts, no password in logs.
5. **Ingestion worker** uses a separate API key with only `observations:write`
   scope — it cannot read reports or transition alerts.
6. **Frontend must degrade honestly** if the backend is unreachable: show
   cached localStorage state labeled as local, never as authoritative.

## Threat notes (for the implementer)

- The demo switcher pattern must NOT be carried into production: shipping a
  client-side role flag as "auth" is the classic failure this guide exists to
  prevent.
- Rate-limit login; log auth failures without passwords; alert admins on
  lockouts.
- CORS: allowlist the exact frontend origin; never `*` with credentials.
