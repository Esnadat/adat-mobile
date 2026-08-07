/**
 * Formats a calendar date for API (Frappe) as YYYY-MM-DD using local date parts.
 * Do not use toISOString() — UTC can shift the calendar day.
 */
export function formatApiDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
