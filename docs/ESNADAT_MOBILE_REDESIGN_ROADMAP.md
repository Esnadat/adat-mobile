# Esnadat Mobile — Visual Redesign Roadmap

**Phase 12A:** planning only (this file). **Future phases:** visual/styling refactors **without** changing business logic, API contracts, or auth/GPS/attendance/request submission behavior unless explicitly scoped.

---

## Guiding constraints (all phases)

- **Preserve:** hooks, services, navigation targets, query params, submit payloads, guards (e.g. unsupported request types).
- **Avoid:** new npm packages unless explicitly approved.
- **Avoid:** fake/mock operational data.
- **Prefer:** theme tokens and shared components over inline hex/`rgba`.
- **Verify after each phase:** `npx tsc --noEmit`.
- **RTL:** Arabic pass included explicitly in **12G**; spot-check in each phase for touched screens.

---

## Phase 12B — Design tokens + shared component polish

**Goal:** Single source of truth for color, radius, spacing, typography usage; reduce duplication in **components** first.

**Likely work:**

- Add or extend theme modules (`tokens`, `radii`, `spacing`) as outlined in `docs/ESNADAT_MOBILE_IDENTITY_V1.md`.
- Refactor **`PremiumCard`**, **`LargeButton`**, **`ActionTile`**, **`StatusPill`**, **`EmptyPanel`**, **`SectionTitle`**, **`ScreenShell`** (styling only), **`AppScreen`**, **`RequestSelectField`** to consume tokens.
- Replace inline shadows on **`TabNavigator`** center button with theme shadow tokens.
- **Optional:** introduce thin wrappers `PrimaryButton` / `SecondaryButton` as aliases (no behavior change).

**Success criteria:** No visual regression on critical flows (smoke test); TypeScript clean; fewer raw hex strings in `src/components`.

---

## Phase 12C — Home (Attendance hub) visual pass

**Goal:** Cockpit feels intentional: fingerprint hero, announcements, today sections, shortcuts — **same data**, calmer hierarchy.

**Likely files:**

- `src/screens/AttendanceScreen.tsx` (layout/styles only)
- `src/components/attendance/FingerprintActionCard.tsx`
- `src/components/home/HomeAnnouncements.tsx`
- `src/components/home/HomeTodaySections.tsx`
- `src/components/home/HomePortalShortcuts.tsx`

**Success criteria:** Consistent card radius/shadows with tokenized `PremiumCard`; navy header unchanged or refined only visually; bottom tab clearance preserved (`floatingTabBarBottomInset`).

---

## Phase 12D — Requests visual pass

**Goal:** Workflow clarity (new vs my requests, chips, forms) — **no endpoint or validation changes**.

**Likely files:**

- `src/screens/RequestsScreen.tsx`
- `src/screens/MyRequestsScreen.tsx`
- `src/screens/RequestsHubScreen.tsx` (if present as wrapper)
- `src/components/requests/RequestSelectField.tsx`

**Success criteria:** Extract or unify **request type** + **filter** chips into shared **`RequestTypeChip`** / **`FilterChip`** styling; inline notices remain non-toast; RTL parity maintained.

---

## Phase 12E — Calendar visual pass

**Goal:** Reduce **scattered hex** in calendar logic — move legend/work-status/event colors to **design tokens**; polish day cells and event list.

**Likely files:**

- `src/screens/CalendarScreen.tsx` (large StyleSheet + helper color functions — refactor to token references only)

**Success criteria:** Calendar behavior and overlay semantics unchanged; colors defined in theme; RTL/readability checked for Arabic labels.

---

## Phase 12F — More / Profile / Payroll / Settings service-center pass

**Goal:** Grouped, scannable **service** layout; muted danger/sign-out; profile card consistency.

**Likely files:**

- `src/screens/MoreScreen.tsx`
- `src/screens/ProfileScreen.tsx`
- `src/screens/PayrollScreen.tsx`
- `src/screens/SettingsScreen.tsx`
- Shared: `src/components/ui/InfoRow.tsx`, `MoneyRow.tsx`, `EmployeeAvatar.tsx`

**Success criteria:** Align section spacing and card styles with Home/Requests; sign-out / destructive actions use semantic tokens.

---

## Phase 12G — Final RTL + spacing QA

**Goal:** Audit **every** screen for Arabic alignment, start/end pairs, chip row direction, modal sheets, and **bottom tab overlap**.

**Checklist:**

- [ ] All primary labels `textAlign` locale-aware where needed
- [ ] Two-column rows use `row-reverse` in AR (`RequestsScreen` patterns as reference)
- [ ] No raw English status strings in AR (`i18n` coverage)
- [ ] `floatingTabBarBottomInset` respected on scroll roots and nested scrolls
- [ ] Focus states visible on primary actions (accessibility polish if tokens allow)

**Likely sweep:** `src/screens/**/*.tsx`, `src/components/**/*.tsx`, `src/navigation/TabNavigator.tsx`.

---

## Files likely to change later (inventory)

> **Do not treat as mandatory every file in every phase** — scope per phase above.

| Area | Paths |
|------|--------|
| Theme | `src/theme/colors.ts`, `src/theme/typography.ts`, `src/theme/shadows.ts`, **new** `src/theme/tokens.ts` (or similar) |
| UI primitives | `src/components/ui/PremiumCard.tsx`, `ScreenShell.tsx`, `AppScreen.tsx`, `SectionTitle.tsx`, `AppHeader.tsx`, `ActionTile.tsx`, `StatusPill.tsx`, `EmptyPanel.tsx`, `LargeButton.tsx`, `NavIcons.tsx`, `EmployeeAvatar.tsx`, `InfoRow.tsx`, `MoneyRow.tsx` |
| Domain UI | `src/components/home/*`, `src/components/attendance/FingerprintActionCard.tsx`, `src/components/requests/RequestSelectField.tsx` |
| Navigation | `src/navigation/TabNavigator.tsx`, `AppNavigator.tsx` |
| Screens | `AttendanceScreen.tsx`, `CalendarScreen.tsx`, `RequestsScreen.tsx`, `MyRequestsScreen.tsx`, `RequestsHubScreen.tsx`, `MoreScreen.tsx`, `ProfileScreen.tsx`, `PayrollScreen.tsx`, `SettingsScreen.tsx`, `LoginScreen.tsx` |
| i18n | `src/i18n/index.ts` (copy tweaks only if UI labels change — not logic) |

---

## Deliverables tracking

| Phase | Deliverable |
|-------|-------------|
| 12A | `docs/ESNADAT_MOBILE_IDENTITY_V1.md`, this roadmap, `.cursor/rules/esnadat-mobile-design-system.mdc` |
| 12B–12G | PR-sized commits per phase + `tsc` + short changelog of **visual** deltas |

---

*Roadmap version: Phase 12A.*
