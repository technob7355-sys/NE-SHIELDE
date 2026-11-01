# NE-SHIELD Backend API Spec

> **STATUS: NOT IMPLEMENTED — SPEC ONLY.**
> The current NE-SHIELD deployment is a 100% static frontend (Vite + React on
> Vercel). There is no server, no database, no auth. Every endpoint below is a
> contract for a future backend. Do not treat any of it as built. The frontend
> today implements the equivalent behaviour in the browser (localStorage) and
> must keep working if the backend never exists.

Companion docs: `database-schema.md` (tables), `auth-rbac-guide.md` (who may
call what), `backend-notifications-spec.md` (ingestion worker + WebSocket),
`deployment-guide.md` (how to stand this up later).

## Conventions

- Base URL: `https://<api-host>/api` (versionless v1; a breaking change ships as `/api/v2`).
- JSON request/response, UTF-8. Timestamps are ISO-8601 UTC.
- Auth: JWT in an `httpOnly`, `Secure`, `SameSite=Lax` cookie, issued by
  `POST /api/auth/login`. Also accepted as `Authorization: Bearer` for
  machine clients. See `auth-rbac-guide.md` for roles.
- Pagination: `?page=1&per_page=50` (max 200). Responses: `{ data, page, per_page, total }`.
- Idempotency: `POST` endpoints that create records accept `Idempotency-Key`.

## Error format (RFC 7807)

```json
{
  "type": "https://neshield.example/problems/validation-error",
  "title": "Validation failed",
  "status": 422,
  "detail": "rainfall_24h must be a non-negative number",
  "trace_id": "01J9…"
}
```

Standard codes: 400 validation, 401 missing/invalid auth, 403 role
insufficient, 404 not found, 409 conflict (idempotency reuse returns the
original 200/201), 429 rate limit, 5xx server.

## Endpoints

### Auth

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/login | — | `{username, password}` → sets JWT cookie. Rate-limited. |
| POST | /api/auth/logout | JWT | Clears cookie. |
| GET | /api/auth/me | JWT | Current operator + role. |

### Zones

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/zones | JWT | All monitoring zones + latest prediction per zone. |
| GET | /api/zones/:id | JWT | Zone detail (static attributes + latest prediction). |
| GET | /api/zones/:id/history | JWT | Observations + predictions, `?from=&to=&horizon=now`, paginated. |

### Observations (ingested sensor/model-estimate data)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/observations | ingestion key | Write one observation batch (worker only). |
| GET | /api/observations | JWT | `?zone_id=&from=&to=`, paginated. Never invents rows. |

### Predictions

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/predictions/latest | JWT | Latest prediction per zone (`?zone_id=` optional). |
| GET | /api/predictions | JWT | History, `?zone_id=&horizon=now|d+1|d+2|d+3&model_version=`, paginated. |

### Alerts

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/alerts | JWT | Filters: `status, severity, zone_id`. |
| POST | /api/alerts/:id/transition | operator+ | Lifecycle transition; writes audit row. Body: `{to, note}`. |
| POST | /api/alerts/:id/notes | operator+ | Append investigation note. |

### Hazard reports

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/hazard-reports | JWT | `?status=&zone_id=`, paginated. |
| POST | /api/hazard-reports | JWT | Submit (server-validated; photo upload returns a signed URL flow). |
| POST | /api/hazard-reports/:id/verify | operator+ | `{verdict: verified|rejected|duplicate, note}`. |

### Incidents

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/incidents | JWT | Field incidents + inspection tasks, `?status=`. |
| POST | /api/incidents | operator+ | Open incident linked to a zone. |
| PATCH | /api/incidents/:id | operator+ | Status / assignee / notes. |

### Notifications

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/notifications | JWT | `?unread=1&since=`, paginated. Per-operator read state. |
| POST | /api/notifications/:id/read | JWT | Mark read. |
| POST | /api/notifications/read-all | JWT | Mark all read. |
| GET | /api/notifications/preferences | JWT | Per-operator channel prefs. |
| PUT | /api/notifications/preferences | JWT | Update prefs. |

### Data-source health

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/data-health | JWT | Per-source freshness as last recorded by the ingestion worker. (Frontend Data Sources view performs its own live checks and does not depend on this.) |

### Health

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/healthz | — | Liveness: `{ok:true, version}`. |
| GET | /api/readyz | — | Readiness: DB reachable, worker heartbeat fresh. |

## Auth model

- Passwords: argon2id hashes, never MD5/SHA1, never in logs.
- JWT: short-lived access token (15 min) + rotating refresh token (7 d, httpOnly).
- Roles: `viewer` < `operator` < `admin`. Role is a JWT claim; the backend
  re-checks it against the DB on every request (never trust client claims).
- Machine-to-machine (ingestion worker): separate long-lived API key with the
  single scope `observations:write`, stored as a hash, rotatable.
- Failed logins: exponential backoff + lockout after 10 attempts; all attempts
  logged to the audit table without passwords.

## What is deliberately NOT promised

- No email/SMS delivery until a provider is configured (`SMS_PROVIDER` is
  `__NONE_CONFIGURED__`); the API never reports a "sent" status it did not get
  from the provider.
- No PII beyond operator accounts. No secrets in frontend code.
- Rate limits and quotas are enforced server-side; the frontend's localStorage
  behaviour is best-effort only and must not be presented as authoritative
  once this backend exists.
