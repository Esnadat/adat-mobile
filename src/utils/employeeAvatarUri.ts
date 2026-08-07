/**
 * Single-character initial for employee display (avatar fallback, logs, etc.).
 */

export function getEmployeeDisplayInitial(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "?";
  const ch = s[0];
  if (/[a-z]/i.test(ch)) {
    return ch.toUpperCase();
  }
  return ch;
}
