# CivicFix

An interactive civic-issue reporting and resolution application. Citizens can report problems with photos and GPS coordinates, support existing reports, and follow their progress. The authority workspace lets a neighborhood team update statuses and publish resolution notes.

## Stack

This implementation uses the project’s provided **Next.js App Router + React + PostgreSQL + Drizzle ORM** stack rather than MongoDB/Express. The application is fullstack: reports, photos, community support, follows, preferences, and resolution history are persisted in PostgreSQL.

- Next.js 16 / React 19 / TypeScript
- PostgreSQL with Drizzle ORM
- Leaflet / React Leaflet with OpenStreetMap and CARTO tiles
- Local variable fonts and locally stored report photography
- Lucide icons

## Features

- Responsive community dashboard with live database statistics
- Two-step civic report form with six categories and three priorities
- Photo upload and drag-and-drop, JPG/PNG/WebP validation, browser-side resizing
- GPS capture with permission handling, interactive map pin, and manual coordinates
- Search, status/category/neighborhood/priority filters, sorting, grid/list views
- Interactive issue map and clickable report pins
- Report detail drawer with photo, location, description, and update history
- Persistent thumbs-up support and following
- Citizen comments and authority status/resolution updates
- Authority issue queue and management workspace
- Activity feed, notification center, profile settings, help/FAQ, and invite-link sharing
- Keyboard-accessible dialogs, focus trapping, Escape handling, and responsive navigation

## Run locally

1. Install dependencies with `npm install`.
2. Set `DATABASE_URL` in `.env` to your PostgreSQL connection string.
3. Apply the database schema with `npx drizzle-kit push`.
4. Start development with `npm run dev`.
5. Open `http://localhost:3000`.

The first page request seeds 12 neighborhood reports, their update history, and the demo community profile. Seeding is protected by a PostgreSQL advisory lock and does not overwrite existing reports.

For production, run `npm run build` and use the deployment platform’s production runtime.

## Accounts, roles, and authority access

Everyone signs in at `/login`, which has two separate portals:

| Portal | Demo account | Can do |
| --- | --- | --- |
| Citizen | `alex@civicfix.demo` / `Citizen@123` | Report issues, support, follow, comment |
| Authority | `officer@civicfix.demo` / `Authority@123` | Everything above, plus change status, set deadlines, authority workspace |

- Public sign-up always creates a **citizen**; there is no way to register as an authority. Authority accounts are created by an administrator (e.g. `update civic_users set role='authority' where email='...'`).
- Roles are stored in the database and read from an HTTP-only session cookie (scrypt-hashed passwords, 7-day sessions). The client never sends its own role.
- Status changes and deadline edits are rejected by the server with **403** for citizens, even if called directly via the API. The authority workspace is hidden from citizens and `/?view=authority` falls back to the overview.
- The citizen portal cannot be used to enter the authority portal.
- Session cookies adapt to how the app is served. Over HTTPS they are `SameSite=None; Secure; Partitioned`, so sign-in also works when the app is shown inside an embedded preview frame on another site; over plain HTTP (localhost) they are `SameSite=Lax`. Because `SameSite=None` removes the cookie's built-in CSRF protection, every API route rejects requests that another website triggers (`Sec-Fetch-Site: cross-site`) with 403.
- If a browser still refuses the cookie, the sign-in form says so and offers to open the app in a new tab instead of silently returning to the login page.
- `node scripts/login-test.mjs` checks sign-in in an embedded cross-site frame (with and without third-party cookies), a direct HTTPS tab, and plain-HTTP localhost.

## Resolution deadlines

Every report gets a deadline when created: **high 48 hours, medium 5 days, low 10 days**. Cards, the authority queue, and report details show a live countdown (on track, due soon <24h, overdue, resolved on time, or resolved late). Authority staff can extend or shorten a deadline (quick +24h/+3d/+7d buttons or a custom date, up to 90 days), with an optional reason posted to the report history. The authority queue can be sorted by "Deadline first", and an overdue counter appears in the sidebar and stats.

## Previous demo note

The application opens as Alex Morgan, a citizen, using a shared demo profile. The **Authority workspace** is an explicitly labeled demonstration of the BBMP community team’s workflow. Its status changes and notes are saved to the database and immediately visible in the citizen views.

This is a demonstration, **not a live municipal reporting service or an authenticated production system**. Both roles share the same demo account. Before a public deployment, add authenticated citizen/authority accounts, server-side role authorization, account ownership checks, upload malware scanning, rate limiting, and your municipality’s real routing and privacy policies. Do not enter sensitive personal information.

## Photos and maps

Uploaded photos are resized in the browser and stored as compressed data URLs with the report. This makes the demo self-contained without an external object-storage service. A production deployment should use private upload validation and object storage.

GPS requires HTTPS (or localhost) and browser location permission. If permission is unavailable, users can pin a map location or enter latitude/longitude manually. Map tiles are served through the app's own `/api/map-tiles/{z}/{x}/{y}` route. To use MapTiler, set `MAPTILER_API_KEY` in `.env` (or your sandbox secrets) and restart the app; the key stays on the server and is never sent to the browser. Optionally set `MAPTILER_MAP_ID` to choose a style (default `streets-v2`). Without a key, the map uses free OpenStreetMap tiles, fetched by the server with an identifying User-Agent and cached. For a high-traffic public deployment, use a MapTiler key or another commercial tile provider, as OSM's tile policy limits heavy use. Map attribution is displayed in the application.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/reports` | Reports, update histories, and demo preferences |
| POST | `/api/reports` | Submit a validated civic report with a photo and coordinates |
| GET | `/api/reports/:id` | Retrieve one report and its history |
| PATCH | `/api/reports/:id` | Support, follow, change status, or post an update |
| PATCH | `/api/preferences` | Save the demo profile and notification preferences |
| GET | `/api/health` | PostgreSQL-backed health check |

Shareable report links use `/?report=ID`. Workspace links use `/?view=overview`, `reports`, `map`, `my-reports`, `authority`, `activity`, `help`, or `settings`.

## Validation

- `npx next typegen`
- `npm exec tsc -- --noEmit --pretty false`
- `npm run build`

For the end-to-end browser suite, install Chromium with `npx playwright install --with-deps chromium`, start the application, and run `node scripts/smoke-test.mjs`. Set `PREVIEW_URL` to test a different running URL. The suite checks citizen reporting, GPS/photo submission, support/follow, authority resolution, preferences, map pins, invitations, and mobile navigation. Its temporary report and demo preferences are cleaned up automatically.

## Emergency use

CivicFix is for non-emergency civic issues. For immediate threats to life or safety, contact local emergency services directly.
