import type { PayrollPayslip, PayrollLineItem } from "../services/payrollService";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** English-digit money (adat rule: no Arabic-Indic digits), 2 decimals. */
function money(amount?: number, currency?: string): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const n = amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${n} ${esc(currency)}` : n;
}

function rows(items: PayrollLineItem[], currency?: string): string {
  return items
    .map(
      (r) =>
        `<tr><td>${esc(r.label)}</td><td class="amt">${money(r.amount, r.currency || currency)}</td></tr>`
    )
    .join("");
}

/**
 * Standalone, print-ready payslip document. Opened via expo-print's OS print
 * dialog (a separate window). Bilingual heading; RTL layout in Arabic. All
 * values come from the payslip print-data (real ERP data) — nothing invented.
 */
export function buildPayslipHtml(p: PayrollPayslip, isAr: boolean): string {
  const dir = isAr ? "rtl" : "ltr";
  const t = {
    title: isAr ? "قسيمة راتب" : "Payslip",
    employee: isAr ? "الموظف" : "Employee",
    employeeId: isAr ? "الرقم الوظيفي" : "Employee ID",
    company: isAr ? "الشركة" : "Company",
    department: isAr ? "القسم" : "Department",
    designation: isAr ? "المسمى" : "Designation",
    period: isAr ? "الفترة" : "Period",
    paymentDate: isAr ? "تاريخ الصرف" : "Payment date",
    earnings: isAr ? "الاستحقاقات" : "Earnings",
    deductions: isAr ? "الاستقطاعات" : "Deductions",
    gross: isAr ? "إجمالي الراتب" : "Gross pay",
    totalDeductions: isAr ? "إجمالي الاستقطاعات" : "Total deductions",
    net: isAr ? "صافي الراتب" : "Net pay",
    bank: isAr ? "البنك" : "Bank",
    iban: "IBAN",
  };
  const period = p.periodLabel || [p.periodStart, p.periodEnd].filter(Boolean).join(" → ");
  const infoRow = (label: string, value?: string) =>
    value ? `<div class="info"><span class="k">${label}</span><span class="v">${esc(value)}</span></div>` : "";

  return `<!doctype html><html dir="${dir}" lang="${isAr ? "ar" : "en"}"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 28px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #16A34A; padding-bottom: 14px; margin-bottom: 18px; }
  .company { font-size: 20px; font-weight: 800; color: #111; }
  .doc { font-size: 15px; font-weight: 700; color: #16A34A; }
  .meta { color: #666; font-size: 12px; margin-top: 4px; }
  .info { display: flex; gap: 8px; font-size: 13px; padding: 3px 0; }
  .info .k { color: #666; min-width: 120px; }
  .info .v { font-weight: 600; }
  .grid { display: flex; gap: 24px; margin: 16px 0; flex-wrap: wrap; }
  .col { flex: 1; min-width: 240px; }
  h3 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #16A34A; margin: 18px 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 7px 4px; border-bottom: 1px solid #eee; }
  td.amt { text-align: ${isAr ? "left" : "right"}; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .net { display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding: 14px 16px; background: #F0FDF4; border: 1px solid #16A34A; border-radius: 10px; }
  .net .lbl { font-weight: 800; font-size: 15px; }
  .net .val { font-weight: 800; font-size: 18px; color: #15803D; font-variant-numeric: tabular-nums; }
</style></head><body>
  <div class="head">
    <div>
      <div class="company">${esc(p.company || "")}</div>
      <div class="meta">${period ? `${t.period}: ${esc(period)}` : ""}</div>
    </div>
    <div style="text-align:${isAr ? "left" : "right"}"><div class="doc">${t.title}</div>
      <div class="meta">${p.reference ? esc(p.reference) : ""}</div></div>
  </div>

  <div class="grid">
    <div class="col">
      ${infoRow(t.employee, p.employeeName)}
      ${infoRow(t.employeeId, p.employeeCode || p.employeeId)}
      ${infoRow(t.designation, p.designation)}
      ${infoRow(t.department, p.department)}
    </div>
    <div class="col">
      ${infoRow(t.paymentDate, p.paymentDate || p.postingDate)}
      ${infoRow(t.bank, p.bankName)}
      ${infoRow(t.iban, p.iban)}
    </div>
  </div>

  <div class="grid">
    <div class="col">
      <h3>${t.earnings}</h3>
      <table>${rows(p.earningsRows || [], p.currency)}
        ${p.grossPay != null ? `<tr><td><strong>${t.gross}</strong></td><td class="amt"><strong>${money(p.grossPay, p.currency)}</strong></td></tr>` : ""}
      </table>
    </div>
    <div class="col">
      <h3>${t.deductions}</h3>
      <table>${rows(p.deductionsRows || [], p.currency)}
        ${p.totalDeductions != null ? `<tr><td><strong>${t.totalDeductions}</strong></td><td class="amt"><strong>${money(p.totalDeductions, p.currency)}</strong></td></tr>` : ""}
      </table>
    </div>
  </div>

  <div class="net"><span class="lbl">${t.net}</span><span class="val">${money(p.netPay, p.currency)}</span></div>
</body></html>`;
}
