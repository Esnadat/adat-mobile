/**
 * Mobile display-only formatting. API payloads must remain YYYY-MM-DD (use formatApiDate).
 * Uses Western (English) digits for day/month/year and time.
 */

export function formatMobileDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
}

/** Parse YYYY-MM-DD as local calendar date; returns null if invalid. */
export function formatYyyyMmDdForDisplay(s: string | undefined | null): string | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s.trim())) return null;
  const part = s.trim().slice(0, 10);
  const [ys, ms, ds] = part.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!y || !m || !d) return null;
  return formatMobileDate(new Date(y, m - 1, d));
}

/** AM/PM suffix (Arabic ص/م when locale is "ar"); numerals stay English per brand. */
function periodLabel(hour24: number, locale?: string): string {
  const isAr = locale === "ar";
  return hour24 < 12 ? (isAr ? "ص" : "AM") : isAr ? "م" : "PM";
}

/** 12-hour clock with AM/PM (English digits) — matches the device's 12-hour display. */
function to12h(hour24: number, minute: number, locale?: string): string {
  let h12 = hour24 % 12;
  if (h12 === 0) h12 = 12;
  const min = String(minute).padStart(2, "0");
  return `${h12}:${min} ${periodLabel(hour24, locale)}`;
}

export function formatMobileTimeFromDate(date: Date, locale?: string): string {
  return to12h(date.getHours(), date.getMinutes(), locale);
}

/** Normalise a "HH:mm(:ss)" wall-clock string to 12-hour with AM/PM (English digits). */
export function formatMobileTimeString(time: string | undefined | null, locale?: string): string {
  if (time == null || !String(time).trim()) return "—";
  const m = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    const h = Number.parseInt(m[1], 10);
    const min = Number.parseInt(m[2], 10);
    if (Number.isFinite(h) && Number.isFinite(min)) return to12h(h, min, locale);
  }
  return String(time).trim();
}

export function formatIsoDateForDisplay(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return formatMobileDate(new Date(t));
}
