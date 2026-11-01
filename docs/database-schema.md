# NE-SHIELD Database Schema

> **STATUS: NOT IMPLEMENTED — SPEC ONLY.**
> No database exists today; all state is per-browser localStorage. This schema
> is the target for a future Postgres 15 + PostGIS backend (see
> `backend-api-spec.md` and `backend-notifications-spec.md`). Migration files
> would be generated from this; nothing here is live.
>
> The 16 entities below follow the master prompt's §17 list as reconstructed
> from the API and notification specs. If the prompt's authoritative list
> differs, treat this file as the draft to reconcile against it.

## Conventions

- Postgres 15, `postgis` extension. All times `TIMESTAMPTZ`.
- Primary keys: `UUID` (operator-facing) or `BIGSERIAL` (high-volume facts).
- Every mutating table has `created_at`; lifecycle tables have `updated_at`.
- Soft delete is NOT used for audit-relevant rows; corrections are new rows.

## Tables (16)

### 1. operators
```sql
CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username CITEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer','operator','admin')),
  password_hash TEXT NOT NULL,            -- argon2id
  failed_logins INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2. refresh_tokens
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3. zones
```sql
CREATE TABLE zones (
  id TEXT PRIMARY KEY,                    -- 'rz-1' … 'rz-20', stable
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  geom GEOMETRY(Point, 4326) NOT NULL,
  slope_deg REAL NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);
-- 20 rows, mirrored from src/data/locations.ts (single source of truth stays
-- in the repo until the backend is live).
```

### 4. observations
```sql
CREATE TABLE observations (
  id BIGSERIAL PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(id),
  observed_at TIMESTAMPTZ NOT NULL,       -- start of the measured/forecast day
  rainfall_24h REAL, rainfall_3d REAL, rainfall_30d REAL,
  soil_moisture_pct REAL,                 -- ERA5 model estimate, never "measured"
  temp_c REAL,
  source TEXT NOT NULL,                   -- 'open-meteo-forecast' | 'open-meteo-archive'
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (zone_id, observed_at, source)
);
CREATE INDEX ON observations (zone_id, observed_at DESC);
```

### 5. predictions
```sql
CREATE TABLE predictions (
  id BIGSERIAL PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(id),
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  horizon TEXT NOT NULL,                  -- 'now' | 'd+1' | 'd+2' | 'd+3'
  model_version TEXT NOT NULL,            -- 'V4-formula'
  score REAL NOT NULL,
  level TEXT NOT NULL,                    -- Low|Moderate|High|Critical|Unknown
  input_snapshot JSONB NOT NULL,          -- inputs used, for audit/replay
  UNIQUE (zone_id, predicted_at, horizon, model_version)
);
```

### 6. alerts
```sql
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,                    -- 'now-<zone>' | 'rise-<zone>' | 'report-<uuid>'
  kind TEXT NOT NULL,                     -- 'model' | 'report'
  zone_id TEXT REFERENCES zones(id),
  severity TEXT NOT NULL,                 -- Critical|High|Moderate
  status TEXT NOT NULL DEFAULT 'new',     -- new|acknowledged|under_investigation|
                                          -- action_required|resolved|rejected|duplicate|invalid
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7. alert_transitions (audit of every lifecycle change)
```sql
CREATE TABLE alert_transitions (
  id BIGSERIAL PRIMARY KEY,
  alert_id TEXT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  operator_id UUID REFERENCES operators(id),
  note TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 8. hazard_reports
```sql
CREATE TABLE hazard_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_name TEXT,
  contact TEXT,                           -- optional; validated, never published
  zone_id TEXT REFERENCES zones(id),      -- nearest zone, correlated server-side
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT,                         -- object storage key, not inline bytes
  status TEXT NOT NULL DEFAULT 'pending', -- pending|verified|rejected|duplicate|invalid
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 9. report_reviews
```sql
CREATE TABLE report_reviews (
  id BIGSERIAL PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES hazard_reports(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id),
  verdict TEXT NOT NULL,                  -- verified|rejected|duplicate|invalid
  note TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 10. incidents
```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id TEXT REFERENCES zones(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',    -- open|in_progress|monitoring|closed
  severity TEXT NOT NULL,
  opened_by UUID REFERENCES operators(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
```

### 11. incident_tasks
```sql
CREATE TABLE incident_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignee_id UUID REFERENCES operators(id),
  due_at TIMESTAMPTZ,
  done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ
);
```

### 12. notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key TEXT NOT NULL,                -- 'critical:<zone>' | 'escalation:<zone>' | …
  type TEXT NOT NULL,                     -- threshold|escalation|data-failure|hazard-report|resolution
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  zone_id TEXT REFERENCES zones(id),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dedup_key, created_at)           -- cooldown enforced in worker SQL
);
CREATE INDEX ON notifications (created_at DESC);
```

### 13. notification_reads
```sql
CREATE TABLE notification_reads (
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, operator_id)
);
```

### 14. notification_preferences
```sql
CREATE TABLE notification_preferences (
  operator_id UUID PRIMARY KEY REFERENCES operators(id) ON DELETE CASCADE,
  channels JSONB NOT NULL DEFAULT '{"in_app": true, "email": false, "sms": false}',
  min_severity TEXT NOT NULL DEFAULT 'Moderate',
  quiet_hours JSONB,                      -- e.g. {"start":"22:00","end":"06:00","tz":"Asia/Kolkata"}
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- email/sms stay OFF until a provider is configured; the API rejects
-- enabling them with a clear 422 while SMS_PROVIDER is unset.
```

### 15. data_source_health
```sql
CREATE TABLE data_source_health (
  source TEXT PRIMARY KEY,                -- 'open-meteo-forecast' | 'open-meteo-archive' |
                                          -- 'esri-tiles' | 'overpass' | 'osrm'
  status TEXT NOT NULL,                   -- healthy|delayed|unavailable|unknown
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Written by the ingestion worker; the frontend Data Sources view does its
-- own live checks and does not depend on this table.
```

### 16. audit_log
```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  operator_id UUID REFERENCES operators(id),
  action TEXT NOT NULL,                   -- 'login' | 'alert.transition' | 'report.verify' | …
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX ON audit_log (entity, entity_id, at DESC);
-- Append-only. No UPDATE/DELETE grants for the app role.
```

## Relationships (summary)

```
operators 1—* refresh_tokens, notification_reads, notification_preferences, alert_transitions, report_reviews, audit_log
zones 1—* observations, predictions, alerts, hazard_reports, incidents, notifications
alerts 1—* alert_transitions
hazard_reports 1—* report_reviews
incidents 1—* incident_tasks
notifications 1—* notification_reads
```

## Migration note

When the backend is built, seed `zones` from `src/data/locations.ts` and keep
that file as the canonical zone list until cutover day. Do not run alert
thresholds as safety-critical without expert review (see deployment-guide).
