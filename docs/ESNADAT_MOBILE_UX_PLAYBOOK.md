# Esnadat Employee Mobile — UX & Product Playbook

Durable guidance for building and evolving the **Esnadat employee self-service HR** app. This document complements `.cursor/rules/esnadat-mobile-product.mdc` for designers, PMs, and engineers.

---

## A. Product principles

1. **HR employee app, not a services supermarket**  
   Each screen answers one question: *What am I doing here right now?*

2. **Hierarchy of truth**  
   Active, shippable capabilities live in the primary visual lane. **Coming soon** capabilities are visible but **muted**, labeled (e.g. قريبًا), and never pretend to be fully operational.

3. **Integrity of data**  
   - No fake lists, mock balances, placeholder tickets, or demo requests.  
   - If the backend cannot supply it, the UI must not imply it can.

4. **Unknown backend**  
   If there is no verified endpoint or contract: **audit first**, or ship as **disabled / coming soon**—never as a fake submit.

---

## B. Navigation principles

### Bottom tabs (fixed mental model)

| Tab (EN) | Tab (AR) | Role |
|----------|----------|------|
| Home | الرئيسية | Cockpit |
| Calendar | التقويم | Time + status + events |
| Requests | الطلبات | Workflow |
| Profile | الملف الشخصي | Identity & HR profile |
| More | المزيد | Service center |

### Tab content expectations

- **Home (cockpit)**  
  Attendance fingerprint, announcements, open tasks, short shortcuts. Avoid cramming every feature into the first scroll.

- **Requests (workflow)**  
  Clear split: **طلب جديد** vs **طلباتي**. Only **real, creatable** request types are prominent. Everything unsupported lives in a **secondary** “coming soon” block—no competing tiles, no dead-end forms.

- **Calendar**  
  **Work/attendance status** is the primary ring or headline state. **Events** (tasks, leave, holidays, etc.) are secondary markers or sections. Never invent events for empty days.

- **More (service center)**  
  Group links (e.g. payroll, policies, support) with headings—not a flat jungle of equal-weight tiles. Coming-soon rows stay low contrast.

---

## C. Design language

### Use

- Clean **cards**, soft shadows, **rounded-xl** (or equivalent tokens).
- **Compact but readable** spacing; clear **typographic hierarchy** (title → meta → action).
- **RTL-first** Arabic: alignment, chip order, and two-column grids follow reading direction.
- **Selected** states obvious; **disabled** states clearly muted (not just gray text with same weight).

### Avoid

- Oversized stacked cards that feel like a marketing landing page.
- Mixed left/right alignment in Arabic (especially labels vs values).
- Debug copy, internal field names, or raw API keys in UI.
- **Noisy toasts** for optional refreshes (prefer inline states).
- **Bottom tab overlap**—always reserve safe bottom inset for floating tabs.

### Visual benchmark (inspiration only)

Think **modern government / enterprise** mobile patterns: dashboard summary cards, request inbox, announcement list, quick actions, grouped services, stable bottom nav. **Do not** clone another product pixel-for-pixel.

### Esnadat identity

Palette: **white / gray / black** with **primary blue** accents; calm, trustworthy, not playful-consumer.

---

## D. Data and API rules

1. **Transport**  
   Always use the app’s **authenticated HTTP layer** (session / `X-Portal-SID` as implemented)—no ad-hoc `fetch` that bypasses established behavior unless explicitly tasked.

2. **BFF-first**  
   Prefer **`GET/POST /api/...`** on the portal BFF over **`/api/resource/<Doctype>`** from the mobile app when permissions or shaping differ between portal user and ERP.

3. **No rogue ERP reads**  
   If mobile currently hits a raw doctype and the employee gets **417/403** or flaky data, the fix is usually **BFF + mobile switch**—not widening ERP permissions blindly from the client.

4. **Feature checklist (audit)**  
   Before building:
   - Existing **mobile** service?
   - Existing **web** client/service?
   - Existing **BFF** route?
   - **DTO** shape and error envelope?
   - **Scoped to logged-in employee** (no trusting client-supplied employee/company for sensitive reads)?

5. **Submit gates**  
   Do not wire **Submit** to guessed URLs. Unsupported flows **must not** call create endpoints (guard in `requestService` or equivalent).

---

## E. Implementation rules

### Before changing code

- List **exact files** you will touch; keep the **smallest** diff that satisfies the task.
- Preserve **working submission** paths unless replacing them intentionally.
- Treat **auth, GPS, and attendance** as sensitive: **do not modify** unless the task explicitly allows it.
- **No new packages** unless explicitly approved.

### After changing code

- Run **`npx tsc --noEmit`**.
- Summarize: **files changed**, **endpoints used**, confirmation of **no fake data**, and **no unintended backend/auth/GPS/attendance** edits.

---

## F. Arabic / RTL rules

1. **Typography**  
   Arabic labels and body text default to **right alignment** where it improves readability; English stays **left** when locale is EN.

2. **Layout direction**  
   Rows (chips, metadata, two-up fields) follow **natural RTL** in Arabic (`row-reverse` or logical equivalents where appropriate).

3. **Start / end pairs**  
   - **Arabic:** **start** field on the **right**, **end** on the **left**.  
   - **English:** **start** **left**, **end** **right**.

4. **Statuses**  
   Never show raw English enums to Arabic users. Minimum mapping:

   | Raw | Arabic |
   |-----|--------|
   | pending | قيد الانتظار |
   | approved | معتمد |
   | rejected | مرفوض |
   | cancelled | ملغي |
   | completed | مكتمل |
   | open | مفتوح |
   | in_progress | قيد التنفيذ |

   Unknown statuses: show a **safe fallback** string; never throw from parsing.

---

## G. Cursor rule

Machine-readable enforcement for agents lives in:

**`.cursor/rules/esnadat-mobile-product.mdc`**

Keep playbook and rule aligned when standards evolve.
