# NE-SHIELD Backend — Notifications & Realtime Spec

> **STATUS: NOT IMPLEMENTED — SPEC ONLY.**
> The current NE-SHIELD deployment is a 100% static frontend (Vite + React on
> Vercel). There is no server, no database, no auth. The in-app notification
> centre, threshold triggers and alert lifecycle are all computed in the
> browser on a ~12-minute polling cycle and persisted in per-browser
> localStorage. Nothing is delivered to other operators or devices.
>
> This document describes EXACTLY what a backend would need to provide true
> multi-operator realtime notifications. Do not treat any of it as built.

## 1. Goals

- Fan-out of threshold-crossing / data-failure / hazard-report events to ALL
  connected operator devices in near-realtime (< 30 s).
- Authenticated operators with roles (viewer / operator / admin).
- Server-side dedup + cooldown (single source of truth, not per-browser).
- Persistent, cross-device audit log of every alert lifecycle transition.
- Optional email/SMS delivery via configured providers (none configured today).

## 2. Proposed architecture

```
ingestion worker (cron every 10 min)
  → fetch Open-Meteo per zone → validate → Postgres
  → run V4 formula inference → store prediction (model_version, horizon, inputs snapshot)
  → evaluate trigger rules (threshold crossing, escalation, data failure)
  → insert notifications (dedupe key + cooldown check in SQL)
  → publish to Redis pub/sub (or Postgres LISTEN/NOTIFY for small scale)
API server (Fastify/Express, Node 20)
  → REST (below) + WebSocket /ws (JWT auth, per-operator channel)
Postgres 15 + PostGIS (zones, observations, predictions, notifications, alerts, audit)
```

## 3. REST endpoints (draft)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/login | — | Issue JWT (httpOnly cookie) |
| GET | /api/zones | JWT | Monitoring zones + latest prediction |
| GET | /api/zones/:id/history | JWT | Observations + predictions (paginated) |
| GET | /api/notifications?unread=1 | JWT | Paginated notifications |
| POST | /api/notifications/:id/read | JWT | Mark read |
| POST | /api/notifications/read-all | JWT | Mark all read |
| GET | /api/alerts | JWT | Alerts with lifecycle status, filters |
| POST | /api/alerts/:id/transition | operator+ | Lifecycle transition + audit row |
| POST | /api/alerts/:id/notes | operator+ | Investigation note |
| GET | /api/hazard-reports | JWT | Submitted reports |
| POST | /api/hazard-reports | JWT | Submit report (server validation) |
| POST | /api/hazard-reports/:id/verify | operator+ | Verify / reject / duplicate |
| GET | /api/data-health | JWT | Per-source freshness |
| GET | /api/healthz | — | Liveness probe |

## 4. WebSocket

- `GET /ws` — JWT in cookie; server pushes `{kind:"notification", payload}`
  and `{kind:"alert_transition", payload}` to all connected operator sessions.
- Heartbeat every 30 s; missed 3 → reconnect with backoff; client replays
  missed via `GET /api/notifications?since=<ts>`.

## 5. Postgres schema (migrations, draft)

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  geom GEOMETRY(Point, 4326) NOT NULL,
  slope_deg REAL NOT NULL
);

CREATE TABLE observations (
  id BIGSERIAL PRIMARY KEY,
  zone_id TEXT REFERENCES zones(id),
  observed_at TIMESTAMPTZ NOT NULL,
  rainfall_24h REAL, rainfall_3d REAL, rainfall_30d REAL,
  soil_moisture_pct REAL,
  source TEXT NOT NULL,           -- 'open-meteo'
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (zone_id, observed_at, source)
);
CREATE INDEX ON observations (zone_id, observed_at DESC);

CREATE TABLE predictions (
  id BIGSERIAL PRIMARY KEY,
  zone_id TEXT REFERENCES zones(id),
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  horizon TEXT NOT NULL,          -- 'now' | 'd+1' | 'd+2' | 'd+3'
  model_version TEXT NOT NULL,    -- 'V4-formula'
  score REAL NOT NULL,
  level TEXT NOT NULL,            -- Low|Moderate|High|Critical|Unknown
  input_snapshot JSONB NOT NULL
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key TEXT NOT NULL,
  type TEXT NOT NULL,             -- threshold|escalation|data-failure|hazard-report|resolution
  severity TEXT NOT NULL,         -- Critical|High|Moderate|Info
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  zone_id TEXT REFERENCES zones(id),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dedup_key, created_at)  -- app-level cooldown enforced in worker
);

CREATE TABLE notification_reads (
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES operators(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, operator_id)
);

CREATE TABLE alerts (
  id TEXT PRIMARY KEY,            -- stable: 'now-<zone>' / 'rise-<zone>' / 'report-<uuid>'
  kind TEXT NOT NULL,             -- 'model' | 'report'
  zone_id TEXT REFERENCES zones(id),
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  -- new|pending_verification|acknowledged|under_investigation|action_required|resolved|rejected|duplicate|invalid
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alert_transitions (
  id BIGSERIAL PRIMARY KEY,
  alert_id TEXT REFERENCES alerts(id) ON DELETE CASCADE,
  from_status TEXT, to_status TEXT NOT NULL,
  operator_id UUID REFERENCES operators(id),
  note TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer','operator','admin')),
  password_hash TEXT NOT NULL,    -- argon2id, never MD5/SHA1
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 6. Trigger rules (server-side, mirror of the frontend engine)

- Threshold crossing into Critical/High, rapid escalation (Δscore ≥ 25),
  data-source failure streak (3 missed polls), downgrade/resolution.
- Cooldown: no repeat Critical per zone within 6 h — except High→Critical
  escalation always fires. Enforced with a SQL check on `notifications`
  by `dedup_key` + `created_at` window before insert.

## 7. Environment variables (placeholders only)

```
DATABASE_URL=postgres://user:__FILL__@host:5432/neshield
JWT_SECRET=__FILL_32B_RANDOM__
OPEN_METEO_URL=https://api.open-meteo.com/v1/forecast
POLL_INTERVAL_MIN=10
SMTP_HOST=__OPTIONAL__
SMS_PROVIDER=__NONE_CONFIGURED__
```

## 8. Deployment options

- Small: single VPS (Docker Compose: api + worker + Postgres + Caddy for TLS).
- Managed: Render/Fly.io (Postgres managed, one web service + one cron worker).
- Do NOT deploy alert thresholds as safety-critical without expert review.

## 9. What is deliberately NOT in this spec

- No email/SMS provider is configured; the UI shows "not configured" and
  never fakes a sent status.
- No PII beyond operator accounts; no secrets in frontend code.
