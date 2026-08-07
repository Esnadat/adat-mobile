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

export function formatMobileTimeFromDate(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

/** Normalise a time string to HH:mm (Western digits). */
export function formatMobileTimeString(time: string | undefined | null): string {
  if (time == null || !String(time).trim()) return "—";
  const m = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    return `${m[1].padStart(2, "0")}:${m[2]}`;
  }
  return String(time).trim();
}

export function formatIsoDateForDisplay(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return formatMobileDate(new Date(t));
}
