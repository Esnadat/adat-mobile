/**
 * ERPNext Leave Type names come back in English (e.g. "Sick Leave"). For the Arabic
 * UI we translate the DISPLAY label only — the value sent to the API stays the exact
 * ERPNext name. Unknown types fall back to the original label unchanged.
 */
const AR_LEAVE_TYPES: Record<string, string> = {
  "annual leave": "إجازة سنوية",
  "sick leave": "إجازة مرضية",
  "casual leave": "إجازة عارضة",
  "unpaid leave": "إجازة بدون راتب",
  "leave without pay": "إجازة بدون راتب",
  "maternity leave": "إجازة أمومة",
  "paternity leave": "إجازة أبوة",
  "marriage leave": "إجازة زواج",
  "bereavement leave": "إجازة وفاة",
  "compassionate leave": "إجازة وفاة",
  "hajj leave": "إجازة حج",
  "emergency leave": "إجازة طارئة",
  "compensatory off": "إجازة تعويضية",
  "compensatory leave": "إجازة تعويضية",
  "study leave": "إجازة دراسية",
  "examination leave": "إجازة اختبارات",
};

/** Returns the Arabic label for known leave types when locale is `ar`, else the original. */
export function localizeLeaveTypeLabel(label: string, locale: string): string {
  if (locale !== "ar") return label;
  const key = String(label ?? "").trim().toLowerCase();
  return AR_LEAVE_TYPES[key] ?? label;
}
