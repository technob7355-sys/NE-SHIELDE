# NE-SHIELD Deployment Guide

## Current setup (live today)

- **100% static frontend.** Vite + React + TS, built with `npm run build`,
  deployed to **Vercel** as a static site. No server, no database, no secrets.
- **Build:** `npm run build` → `dist/`. Vercel builds on every push to `main`.
- **Runtime data flow (all client-side):**
  1. Browser fetches Open-Meteo forecast + archive directly (no proxy).
  2. V4 formula scores each of the 20 zones every **12 minutes**
     (`POLL_INTERVAL_MS` in `src/services/notifications.ts`).
  3. Alerts, notifications, hazard reports persist in per-browser localStorage.
  4. Hospitals via Overpass API, routes via OSRM, tiles via Esri — all direct
     from the browser. Overpass is 406-blocked from some sandboxes; the UI
     shows "unavailable", never fake data.

## Environment variables

**None are required.** The app calls only public, keyless endpoints:
`api.open-meteo.com`, `archive-api.open-meteo.com`,
`server.arcgisonline.com`, `overpass-api.de` (+ mirror), `router.project-osrm.org`.
Do not add secrets to the frontend build — anything in `dist/` is public.

## Health checks (today)

- **Top-bar ApiStatus pill:** live fetch of Open-Meteo forecast + archive with
  a 20 s timeout; green = Connected, red = Connection failed, Refresh button
  re-runs it.
- **Data Sources view** (`src/components/DataSources.tsx`): per-source
  Healthy / Delayed / Unavailable / Unknown with last success, expected
  interval, last error, latency. Checks run in the browser — a "failure" here
  means *this browser* could not reach the source, which is exactly what the
  operator experiences.
- **Stale-data rule:** zone data older than 6 h (`STALE_AFTER_MS` in
  `src/services/dataQuality.ts`) is badged STALE; missing data renders the
  grey Unknown state, never Low.

## Adding a backend later

Follow `backend-api-spec.md` + `database-schema.md` + `backend-notifications-spec.md`:

1. Provision Postgres 15 + PostGIS; apply the schema; seed `zones` from
   `src/data/locations.ts`.
2. Deploy the API (Node 20, Fastify/Express) behind TLS; set `DATABASE_URL`,
   `JWT_SECRET` (32 random bytes), `OPEN_METEO_URL`, `POLL_INTERVAL_MIN`.
3. Run the ingestion worker on a 10-minute cron: fetch → validate → store →
   score → dedupe/cooldown → notify.
4. Point the frontend at the API base URL (env at build time, e.g.
   `VITE_API_BASE`). Keep the direct-Open-Meteo path as the offline fallback,
   clearly labeled.
5. Cut over localStorage state per-operator to server state; keep the demo
   role switcher labeled as demo until real auth ships.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| ApiStatus red / zones Unknown | Open-Meteo unreachable from client network | Check client connectivity; the app degrades honestly, no action needed |
| Hospitals "unavailable" | Overpass 406 from sandbox/VPN | Expected; works in real browsers. Never fabricate. |
| Map tiles grey | Esri blocked | Check network; Data Sources view confirms |
| Stale badges everywhere | Polling blocked (ad-blocker, offline) | Data older than 6 h is STALE by design |
| Vercel build fails | TS error | Run `npx tsc --noEmit -p tsconfig.app.json` locally first |
| After deploy, "no changes reflect" | Browser cache | Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R |

## Safety note

Do not present alert thresholds as safety-critical without expert review.
The site carries "not an official government warning" disclaimers on every
operational surface — keep them in any future deployment.
