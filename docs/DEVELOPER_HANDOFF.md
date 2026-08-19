# adat — Developer Handoff (living document)

Maintained incrementally. Covers new routes, architecture decisions, env/keys, and the dev loop.
Repos: `esnadat-employee-mobile` (Expo RN), `portal-api` (BFF, pm2 `portal-api` on :3002),
`app` (Next.js portal, pm2 `esnadat-portal` on :3000). ERPNext bench: `/home/frappe/esnadat-bench`.

## Environments
- **Production ERPNext:** https://app.esnadat.sa. Portal BFF talks to it via `FRAPPE_URL`.
- **Staging ERPNext:** `staging.esnadat.sa` bench site (prod DB copy; developer_mode; DB admin `benchadmin`).
  The BFF has **no** staging web vhost. To drive the BFF against staging with no sudo: run a copy of
  portal-api with `PORT=3003`, `FRAPPE_URL=http://127.0.0.1:8010`, and a tiny Node reverse proxy on 8010
  that rewrites the Host header to `staging.esnadat.sa` before forwarding to gunicorn 127.0.0.1:8000
  (Node fetch/undici ignores a manual Host header, so a proxy is required). The BFF is stateless on
  sessions — the portal_sid cookie IS the ERP session; mint one via `POST /api/method/login`.
- **Fact (verified on staging):** cancelling a submitted Leave Application (docstatus 2) auto-restores
  the leave balance (HRMS 15 removes the ledger entries). No manual intervention.

## New BFF routes (portal-api, all company-scoped for tenant isolation)
### Leave-cancellation (two-stage: employee → direct manager → HR)
Store: `leave-cancellation-requests-store.js` (JSON, gitignored under data/). ERPNext stays source of
truth: HR approval cancels the Leave Application (docstatus 2) FIRST, marks the request approved only on
success; on ERP failure → `cancel_failed` (retryable, 502). Business rule (phase 1): only leaves not yet
started (from_date > today); started/ended → 422.
- `GET  /api/leave-cancellations/eligible-leaves`
- `POST /api/leave-cancellations`  (employee → pending_manager)
- `GET  /api/leave-cancellations`  (own)
- `GET  /api/manager/leave-cancellations`  + `POST /api/manager/leave-cancellations/:id/approve|reject`
- `GET  /api/hr/leave-cancellations`       + `POST /api/hr/leave-cancellations/:id/approve|reject`
Negative tests (staging): owner 403/404, wrong-manager 403 NOT_DIRECT_REPORT, non-HR 403,
HR stage-jump 409 NOT_PENDING_HR, started-leave 422, ERP-cancel-failure 502 + retry.

### Manager approvals aggregation
`buildManagerPendingApprovalsPayload` (server.js) now also returns pending_manager leave-cancellations
(type `cancel_leave`) for direct reports → surfaced in `GET /api/manager/pending-leave-approvals` and the
notifications count. `resolveManagerReadContext` returns empty (200) for non-managers (no 403).

### Team-member attendance
`GET /api/manager/team-member/:employee/attendance` → recent Employee Checkins + Shift Assignments for a
direct report (real ERP data), gated by the same direct-report check as the profile endpoint.
Verified: manager→report 200; manager→non-report 403; non-manager 403.

## Portal (Next.js `app`)
Leave-cancellation approvals are **merged into the existing `/requests` list** (unified requests/approvals
page), mirroring the operational-attendance merge: `request_source_kind: "leave_cancellation"`,
`lib/requests/map-leave-cancellation-row.ts`, `lib/api/services/leave-cancellations.service.ts`.
There is intentionally **no standalone page** (principle: one requests box, not many). Approve/reject
dispatch routes to the manager or HR endpoint by the row's stage.

## Mobile app
- Managed Expo (SDK 54). One dev-client-only native dep: **react-native-maps** — gated so Expo Go loads
  a placeholder (`GeofenceView` require()s the real `GeofenceMap` only when NOT Expo Go). No biometric
  native module ("fingerprint" is attendance iconography only).
- `.env` → `EXPO_PUBLIC_API_BASE_URL=https://portal.esnadat.sa` (production).
- New request type `cancel_leave` in RequestsScreen; timeline in RequestDetail; withdraw (pending only);
  Tasks "بانتظار موافقتي" tab; team-member shifts/attendance; hamburger drawer (AppDrawer + DrawerContext);
  payslip print via `expo-print` → PDF → `expo-sharing` share sheet.

## Dev loop
Plain Expo Go works (maps gated). Public IP 8081 is internet-reachable on this server. Run persistently:
`REACT_NATIVE_PACKAGER_HOSTNAME=72.62.133.68 npx expo start --port 8081` → Expo Go → `exp://72.62.133.68:8081`.
iOS **dev client** (for the live map) requires registering the device UDID first: `eas device:create`
(interactive, needs a TTY + Apple login), then `eas build --profile development --platform ios`.

## Keys / credentials (paths, not secrets)
- EAS account: `saudalfredi`; Apple team `242P2W89HF`; iOS bundle `com.adathr.adat`; ASC app id `6799277283`.
- ASC API key: `/home/frappe/.eas-credentials/AuthKey_Y2C623HU6R.p8`. Play service account:
  `/home/frappe/.eas-credentials/adat-504200-cb3c07e10463.json` (needs Play Console release permission —
  Android `eas submit` currently fails until `adatapp@adat-504200.iam.gserviceaccount.com` is granted it).
- Google Maps: Android key via EAS secret `GOOGLE_MAPS_ANDROID_KEY` (app.config.js injects it). iOS Maps
  SDK key still pending from the owner (maps batch deferred).

## Build-12 bug status
1. **Support "failed"** — FIXED (commit bffec58). Real cause (prod logs): title <3 / details <5 chars,
   not device_type (backend accepts device_type). Client now validates length + surfaces the server
   message. Staging evidence: valid → 201; short title → 400 SUPPORT_TITLE_REQUIRED; short details → 400
   SUPPORT_DETAILS_REQUIRED.
2. **Payslip print** — FIXED (bffec58). Print.printAsync failed on iOS; replaced with
   printToFileAsync → PDF → expo-sharing share sheet (Print/Save/AirDrop), printAsync fallback.
3. **Hamburger overlap** — FIXED (bffec58). Moved ☰ into ScreenShell header (flex row) via DrawerContext,
   shown only on main tabs; removed the floating overlay.
4. **Navigation (abrupt)** — DIAGNOSED, not yet fixed (awaiting decision). Root cause: the primary nav is
   NOT a real navigator — `TabNavigator` is a hand-rolled state machine (`activeTab`/`moreStackView` +
   `display:none/flex` swapping), so no transitions, no swipe-back on "more" sub-views, hard flashes. The
   root `AppNavigator` IS a proper native-stack (detail screens are fine). Fix = replace the custom
   swapper with real navigators (bottom-tabs + push "more" screens onto the root stack).

All fixes verified to bundle (expo export ok). Awaiting on-device confirmation via Expo Go / dev client.
