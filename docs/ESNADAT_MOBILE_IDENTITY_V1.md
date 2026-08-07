# Esnadat Mobile — Identity v1 (Design System Plan)

**Phase:** 12A — audit and plan only. **No implementation in this document.**

This plan professionalizes the **visual identity** of the employee self-service app while **preserving all existing logic, APIs, and flows**. Implementation begins in Phase 12B+.

---

## 1) Current design inventory

### 1.1 Color system (`src/theme/colors.ts`)

| Token | Role |
|------|------|
| `navy` `#0A1628` | Status bar, `ScreenShell` header, top safe area |
| `primary` / `accentBlue` `#003B8F` | Brand CTA, active tab, accent bar, links |
| `primaryDark` `#002B66` | Strong contrast on light surfaces |
| `primaryLight` `#EBF2FF` | Secondary buttons, icon wells |
| `ink` `#111111`, `text` `#17212B`, `textSecondary`, `textMuted` | Body hierarchy |
| `background` `#F7F9FC` | App / scroll surface |
| `surface`, `card` `#FFFFFF` | Cards, tab bar container |
| `surfaceElevated` `#EBF3FF` | `PremiumCard` tinted / hero |
| `surfaceSubtle` `#F6F8FC` | Muted panels |
| `border` / `divider` `#DDE5F2`, `borderStrong` | Card/input borders |
| `success` / `successLight` / `successDark` | Success states (not brand primary) |
| `danger` / `dangerLight`, `warning` / `warningLight` | Errors, warnings |

**Gaps:** No dedicated **focus ring**, **pressed overlay**, **skeleton**, or **disabled text** tokens; several screens use **raw `rgba` / hex** instead of tokens.

### 1.2 Typography (`src/theme/typography.ts` — `type` export)

- `screenTitle` 22/800, `cardTitle` 16/700, `label` 13/600, `caption` 11/600, `body` 15/500, `bodyStrong` 15/700, `numericHero` 32/800, `numericLg` 17/700.

**Usage reality:** Many components and screens use **inline `fontSize` / `fontWeight`** (e.g. `SectionTitle` 23/800, `TabNavigator` labels 11/600, `LargeButton` 16/700) — the shared `type` scale is **underused**.

### 1.3 Cards

- **`PremiumCard`:** radius 16 (normal) / 20 (hero), padding 20 / 24, border `rgba(0, 43, 102, 0.10)`, `shadowCard`; optional `tinted` → `surfaceElevated` + `shadowMedium`.
- **`ActionTile`:** radius 18, `shadowSoft`, borders from `colors.border` or active rgba; soon tone uses `#FBFCFD` / `#ECEEF1`.
- **`EmptyPanel`:** radius 22, `shadowSoft`, centered copy.

**Pattern:** “Premium” card is the **closest thing to a standard**; other surfaces diverge in radius and shadow.

### 1.4 Shadows / elevation (`src/theme/shadows.ts`)

- `shadowCard`, `shadowMedium`, `shadowFloat` (tab bar), `shadowSoft`.
- **Hex shadow color:** `#0D1B3E` (consistent).
- **Extra:** `floatingTabBarBottomInset = 98` (content clearance — used in `ScreenShell`, `AppScreen`, and some screens).

### 1.5 Border radius (observed)

| Approx range | Where |
|-------------|--------|
| 2 | Section accent bar, small UI marks |
| 8–12 | Inputs, day cells, small controls |
| 14–18 | Buttons, tiles, list cards |
| 16–20 | `PremiumCard`, login, tab shell |
| 22–24 | Empty states, modals |
| 999 | Pills, fingerprint aura, chips |

**Inconsistency:** **14 / 16 / 18 / 20 / 22** all appear as “card-like” radii without a single named scale.

### 1.6 Spacing

- Common horizontal **20** in `ScreenShell` / `AppScreen` content; `PremiumCard` **20–24** padding.
- Screens (e.g. Requests, Calendar) add **ad hoc** `marginBottom`, `gap`, and `padding` in local `StyleSheet`s.

**No global spacing scale** (e.g. 4/8/12/16) in theme today.

### 1.7 Inputs & form controls

- **`RequestSelectField`:** label + field (radius 12), chevron, modal sheet — aligned with `colors` but **not** shared with other screens’ `TextInput` blocks.
- **Requests / Login / etc.:** **local** border colors (`rgba(0, 43, 102, …)`), mixed radius (10–14).

### 1.8 Buttons

- **`LargeButton`:** full width, min height 56, radius **14**, primary / secondary / danger, disabled via opacity **0.55** (not a token).

### 1.9 Chips / badges

- **`StatusPill`:** semantic tones (success / warning / danger / neutral), radius 999, 12/700 text.
- **MyRequestsScreen / RequestsScreen:** **local** “type” chip styles (radius 10, custom borders) — not reused as one component.
- **CalendarScreen:** event dots and legend use **local hex** palette (purple, blue, green, etc.).

### 1.10 Bottom tab (`src/navigation/TabNavigator.tsx`)

- Floating **white** bar, radius **20**, border `rgba(0, 43, 102, 0.13)`, `shadowFloat`.
- **Center “Home”** tab: elevated circle (54px), active = `primary` fill; inactive = outline + muted icon.
- **RTL:** `tabRowDir` flips to `row-reverse` when Arabic and not system RTL.
- **Order:** Profile | Requests | **Home (center)** | Calendar | More (differs from common “Home-first” left-to-right mental model; document for future polish only).

### 1.11 Header patterns

- **`ScreenShell`:** **navy** block, white title 22/800, subtitle `rgba(255,255,255,0.65)`.
- **`AppHeader`:** alias of **`SectionTitle`** — **on light background** (ink title, primary accent bar, optional subtitle) — different from `ScreenShell`.
- **`TabNavigator` sub-stack:** navy header with back + centered title (payroll/settings).

**Two header families:** “in-navy” vs “on-canvas section title”.

### 1.12 Arabic / RTL

- Widespread **`isAr` / `useAppLocale()`** with `textAlign: "right"`, `row-reverse` on key rows (Requests, MyRequests, `ActionTile`, `RequestSelectField` sheet).
- **SectionTitle:** accent bar `alignSelf: "flex-end"` in AR.
- **Gaps:** Some screens still mix alignment; **Calendar** encodes many **visual colors in logic** (see inconsistencies).

### 1.13 i18n

- `src/i18n/index.ts` — copy for tabs (`home`, `profileTab`, `requestsTab`, `calendarTab`, `moreTab`) and home sections; **not a visual file** but source of **localized labels** for any redesign.

---

## 2) Inconsistencies (summary)

| Area | Issue |
|------|--------|
| **Colors** | Many `rgba(0, 43, 102, …)` and one-off hex strings in **CalendarScreen**, **ProfileScreen**, **RequestsScreen**, **TabNavigator**, **ActionTile**, **FingerprintActionCard**, **LoginScreen**, **MoreScreen** |
| **Blue usage** | Primary blue vs lighter blues (`#EAF2FF`, `#2F6FEB` in calendar) — **multiple “accent” blues** without tokens |
| **Cards** | `PremiumCard` (16/20) vs `ActionTile` (18) vs `EmptyPanel` (22) vs local screen cards |
| **Shadows** | Theme exports vs **inline** `shadowColor: "#000"` on tab center button |
| **Typography** | `type.*` defined but **not consistently imported**; duplicate sizes (22 vs 23 title) |
| **Buttons** | Only `LargeButton` is shared; many **Pressable** + local styles elsewhere |
| **Chips** | `StatusPill` vs **inline** request type / filter chips |
| **Bottom spacing** | `floatingTabBarBottomInset` is standard in shell; some screens add **extra** local padding — risk of **double** or **insufficient** clearance if not re-audited per screen |
| **RTL** | Generally good on Requests; **Calendar** and some cards need **12G** pass |
| **AppHeader** | `AppHeader` === `SectionTitle` naming may confuse; not a true “top bar” component |

---

## 3) Proposed Esnadat Mobile Identity v1 (direction)

- **Positioning:** Premium **HR enterprise** — calm, trustworthy, **not** consumer-playful.
- **Base:** **White** and **soft cool gray** backgrounds (`background`, `surface`, `surfaceSubtle`).
- **Header / chrome:** **Navy / ink** for top brand bar (align with existing `navy` / `ink` — slightly tighten contrast hierarchy).
- **Accent:** **Esnadat primary blue** (`#003B8F` family) for **one** primary action per view, selected states, key links.
- **Neutrals:** **Black/ink** for primary text; **muted grays** for secondary; avoid rainbow except **semantic** status and **calendar category** (see tokens).
- **Status:** **Subtle** success / warning / danger surfaces only where state matters; default UI stays **quiet**.
- **Density:** **Compact professional** cards — slightly tighter vertical rhythm than today’s heaviest blocks, without hurting touch targets (min ~44pt where interactive).
- **Arabic:** **RTL-first** — section headers, form rows, chip rows, and start/end pairs follow locale (per existing product rules).

---

## 4) Proposed design tokens (v1)

> **Implementation note (12B):** add e.g. `src/theme/tokens.ts` (or extend `colors.ts` + new `spacing.ts` / `radii.ts`) and migrate screens **gradually** — no behavior changes.

### 4.1 Colors (extend / alias current)

- **Background:** `background`, `backgroundSecondary` (optional, for subtle section alternation).
- **Surface:** `surface`, `surfaceRaised`, `surfaceMuted`, `surfaceBrandWash` (replace ad-hoc `#EAF2FF` / rgba washes).
- **Text:** `textPrimary` (ink), `textSecondary`, `textTertiary` / `textDisabled` (explicit disabled, not only opacity).
- **Border:** `borderDefault`, `borderStrong`, `borderFocus` (primary-tinted).
- **Brand:** `brand`, `brandPressed`, `brandOnBrand` (white).
- **Semantic:** `statusSuccess` / `statusSuccessBg`, `statusWarning` / `statusWarningBg`, `statusDanger` / `statusDangerBg`, `statusInfo` / `statusInfoBg` (optional, for neutral “open” states).
- **Overlays:** `scrim` (modal backdrop), `overlayPressed` (pressed state on list rows).
- **Calendar (data-viz only):** `calWork`, `calLeave`, `calTask`, `calHoliday`, `calAnnounce` — **map existing hex** in **one file** to avoid scatter.

### 4.2 Radius scale

| Token | Use |
|-------|-----|
| `radiusXs` 2 | Accent bars, tiny markers |
| `radiusSm` 8 | Small controls, inline badges |
| `radiusMd` 12 | Inputs, compact rows |
| `radiusLg` 16 | **Default card** |
| `radiusXl` 20 | **Hero** card, floating tab container |
| `radiusFull` 999 | Pills, circular affordances |

**Rule:** pick **one** default card radius (`Lg` or `Xl`) for 80% of content; hero/floating exceptions only.

### 4.3 Spacing scale (4pt grid)

- `space1` 4, `space2` 8, `space3` 12, `space4` 16, `space5` 20, `space6` 24, `space8` 32.
- **Screen** horizontal padding: standardize on `space5` (20) unless full-bleed.
- **Card** padding: `space5` default, `space6` hero.

### 4.4 Typography (unify with `type`)

- **Map** all screen-level titles to `type.screenTitle` (resolve **22 vs 23** → one value).
- **Add** `type.sectionLabel` (uppercase or small caps optional — only if used consistently).
- **Line heights** and **letter spacing** for AR: keep `SectionTitle` pattern (AR `letterSpacing: 0`).

### 4.5 Shadows

- Keep `shadowCard` / `shadowMedium` / `shadowFloat` / `shadowSoft` — **tokenize shadow color** as `shadowColorNavy` in theme.
- **Remove** duplicate inline black shadows on tab — use token.

### 4.6 Status & disabled

- **Disabled:** `textDisabled` + `opacityDisabled` (e.g. 0.5–0.55) applied at **component** level, not ad-hoc per screen.
- **Status chips:** map ERP strings to **tones** + i18n labels (existing product rules).

### 4.7 Field / input tokens

- `inputHeight`, `inputRadius` (= `radiusMd`), `inputBorder`, `inputBorderError`, `inputBg`, `inputPlaceholder` (tertiary text color).

### 4.8 Chip / badge tokens

- `chipHeight`, `chipRadius` (= `radiusFull` or `radiusSm` for square-ish tags), `chipPadH`, `chipPadV`, `chipBorder`, `chipBgNeutral`.

---

## 5) Component system proposal

Standardize primitives so **screens compose** instead of re-styling:

| Component | Responsibility |
|-----------|----------------|
| **ScreenHeader** | Unified **navy** in-shell header OR transparent variant — props: title, subtitle, optional right action (future); today split between `ScreenShell` and sub-stack header |
| **SectionHeader** | Rename/clarify vs `SectionTitle`: title + optional action row + bottom spacing token |
| **PremiumCard** | Keep as base; variants: `elevated`, `tinted`, `compact` (padding/radius from tokens) |
| **StatCard** | Numeric hero + label + optional delta (payroll / attendance summaries) |
| **ServiceTile** | Wrapper around **`ActionTile`** or successor — consistent icon well, title, subtitle, chevron |
| **RequestTypeChip** | Selected/unselected/soon states for request flow |
| **StatusChip** | Extend **`StatusPill`** or alias — map status enums + i18n |
| **FormField** | Label + children slot + error text + RTL alignment |
| **SelectField** | Evolve from **`RequestSelectField`** — generic options API |
| **DateField** | Pressable row + modal/picker shell — shared border/radius |
| **PrimaryButton** | Alias **`LargeButton`** primary + token sizing |
| **SecondaryButton** | Outline / ghost variants |
| **EmptyState** | Evolve **`EmptyPanel`** — optional illustration slot, primary/secondary actions |
| **InlineNotice** | Info / warning / error banner (non-toast) |
| **SkeletonBlock** | Placeholder for loading lists (optional **12B** if lightweight View placeholders only — **no new packages**) |

**Existing to preserve:** `EmployeeAvatar`, `InfoRow`, `MoneyRow`, `NavIcons` — restyle against tokens only.

---

## 6) Alignment with `.cursor/rules/esnadat-mobile-product.mdc`

Identity v1 reinforces: **no fake data**, **BFF-first**, **RTL-first**, **workflow separation** on Requests, **quiet** chrome. Visual tokens must not encourage **debug-like** UI or **raw English** statuses in Arabic.

---

## 7) Cursor rules (recommended)

See **`.cursor/rules/esnadat-mobile-design-system.mdc`** — tokens-only colors, RTL QA, screen polish checklist.

---

## 8) References (repo paths audited)

- **Theme:** `src/theme/colors.ts`, `typography.ts`, `shadows.ts`
- **Components:** `src/components/**/*` (incl. `ui/*`, `home/*`, `attendance/*`, `requests/*`)
- **Navigation:** `src/navigation/TabNavigator.tsx`, `AppNavigator.tsx`
- **Screens:** `src/screens/*.tsx` (inventory via grep + sampling)
- **i18n:** `src/i18n/index.ts`

---

*Document version: Phase 12A — audit & plan only.*
