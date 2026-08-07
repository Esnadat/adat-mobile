import { http } from "./http";

type PayrollRecord = Record<string, unknown>;
const DEBUG_PAYROLL_SHAPE = false;
const DEBUG_PAYROLL_DETAIL_SHAPE = true;
let loggedProfileShape = false;
let loggedPayslipsShape = false;
let loggedPayslipDetailShape = false;

export interface PayrollProfile {
  employeeId?: string;
  employeeName?: string;
  employeeCode?: string;
  company?: string;
  department?: string;
  designation?: string;
  employmentType?: string;
  bankName?: string;
  iban?: string;
  bankAccount?: string;
  paymentMethod?: string;
  currency?: string;
  basicSalary?: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowances?: number;
  totalEarnings?: number;
  totalDeductions?: number;
  netSalary?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface PayrollLineItem {
  code?: string;
  label: string;
  amount?: number;
  currency?: string;
  type: "earning" | "deduction";
}

export interface PayrollPayslip {
  id: string;
  reference?: string;
  periodLabel?: string;
  periodStart?: string;
  periodEnd?: string;
  postingDate?: string;
  paymentDate?: string;
  status?: string;
  currency?: string;
  grossPay?: number;
  totalEarnings?: number;
  totalDeductions?: number;
  netPay?: number;
  earningsRows: PayrollLineItem[];
  deductionsRows: PayrollLineItem[];
  bankName?: string;
  iban?: string;
  bankAccount?: string;
  employeeId?: string;
  employeeName?: string;
  employeeCode?: string;
  company?: string;
  department?: string;
  designation?: string;
  employmentType?: string;
}

function asRecord(v: unknown): PayrollRecord | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as PayrollRecord;
  return null;
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function toString(v: unknown): string | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

function firstString(row: PayrollRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = toString(row[key]);
    if (value) return value;
  }
  return undefined;
}

function firstNumber(row: PayrollRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = toNumber(row[key]);
    if (value != null) return value;
  }
  return undefined;
}

function toItemsArray(raw: unknown): PayrollRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(asRecord).filter((x): x is PayrollRecord => x !== null);
}

function normalizeLineItems(
  raw: unknown,
  type: "earning" | "deduction",
  fallbackCurrency?: string
): PayrollLineItem[] {
  const items = toItemsArray(raw);
  return items
    .map((row): PayrollLineItem | null => {
      const label = firstString(row, ["salary_component", "component", "label", "name", "title"]);
      if (!label) return null;
      return {
        code: firstString(row, ["abbr", "code", "component_code"]),
        label,
        amount: firstNumber(row, ["amount", "default_amount", "value"]),
        currency: firstString(row, ["currency"]) || fallbackCurrency,
        type,
      };
    })
    .filter((x): x is PayrollLineItem => x !== null);
}

function normalizeRuleItems(
  raw: unknown,
  type: "earning" | "deduction",
  fallbackCurrency?: string
): PayrollLineItem[] {
  const items = toItemsArray(raw);
  return items
    .map((row): PayrollLineItem | null => {
      const label = firstString(row, ["label_ar", "label_en", "salary_component", "component", "label", "name", "title", "key"]);
      if (!label) return null;
      return {
        code: firstString(row, ["key", "abbr", "code", "component_code"]),
        label,
        amount: firstNumber(row, ["amount", "value", "default_amount", "total"]),
        currency: firstString(row, ["currency"]) || fallbackCurrency,
        type,
      };
    })
    .filter((x): x is PayrollLineItem => x !== null);
}

function sumLineItems(rows: PayrollLineItem[]): number | undefined {
  if (rows.length === 0) return undefined;
  let sum = 0;
  let hasAny = false;
  for (const row of rows) {
    if (row.amount == null || !Number.isFinite(row.amount)) continue;
    sum += row.amount;
    hasAny = true;
  }
  return hasAny ? sum : undefined;
}

function normalizeProfile(raw: unknown): PayrollProfile | null {
  const row = asRecord(raw);
  if (!row) return null;
  const currency = firstString(row, ["currency"]);
  const totalEarnings = firstNumber(row, ["gross_pay", "grossPay", "total_earnings", "totalEarnings"]);
  const totalDeductions = firstNumber(row, ["total_deduction", "total_deductions", "totalDeductions"]);
  const netSalary = firstNumber(row, ["net_pay", "net_salary", "netPay", "netSalary", "rounded_total"]);
  return {
    employeeId: firstString(row, ["employee_id", "employee", "id"]),
    employeeName: firstString(row, ["employee_name", "full_name", "name"]),
    employeeCode: firstString(row, ["employee_code", "employee_no", "employee_number"]),
    company: firstString(row, ["company"]),
    department: firstString(row, ["department"]),
    designation: firstString(row, ["designation"]),
    employmentType: firstString(row, ["employment_type"]),
    bankName: firstString(row, ["bank_name", "bank"]),
    iban: firstString(row, ["iban"]),
    bankAccount: firstString(row, ["bank_account", "bank_ac_no", "salary_bank_account"]),
    paymentMethod: firstString(row, ["payment_method", "mode_of_payment"]),
    currency,
    basicSalary: firstNumber(row, ["basic_salary", "basicSalary"]),
    housingAllowance: firstNumber(row, ["housing_allowance", "housingAllowance"]),
    transportAllowance: firstNumber(row, ["transport_allowance", "transportAllowance"]),
    otherAllowances: firstNumber(row, ["other_allowance", "other_allowances", "otherAllowances"]),
    totalEarnings,
    totalDeductions,
    netSalary,
    effectiveFrom: firstString(row, ["effective_from", "start_date", "period_start"]),
    effectiveTo: firstString(row, ["effective_to", "end_date", "period_end"]),
  };
}

function normalizePayslip(raw: unknown): PayrollPayslip | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = firstString(row, ["id", "name", "salary_slip"]);
  if (!id) return null;
  const currency = firstString(row, ["currency"]);
  const earningsRows = [
    ...normalizeLineItems(row.earnings, "earning", currency),
    ...normalizeLineItems(row.earning_components, "earning", currency),
    ...normalizeRuleItems(row.allowance_rules, "earning", currency),
  ];
  const deductionsRows = [
    ...normalizeLineItems(row.deductions, "deduction", currency),
    ...normalizeLineItems(row.deduction_components, "deduction", currency),
    ...normalizeRuleItems(row.deduction_rules, "deduction", currency),
  ];
  const totalEarnings =
    firstNumber(row, ["total_earnings", "gross_pay", "gross_salary", "grossPay", "totalEarnings"]) ?? sumLineItems(earningsRows);
  const totalDeductions =
    firstNumber(row, ["total_deduction", "total_deductions", "totalDeductions"]) ?? sumLineItems(deductionsRows);
  return {
    id,
    reference: firstString(row, ["payslip_reference", "name", "salary_slip", "id"]),
    periodLabel: firstString(row, ["payroll_period", "period", "month", "salary_month"]),
    periodStart: firstString(row, ["start_date", "period_start", "from_date"]),
    periodEnd: firstString(row, ["end_date", "period_end", "to_date"]),
    postingDate: firstString(row, ["posting_date"]),
    paymentDate: firstString(row, ["payment_date", "paid_on", "transaction_date"]),
    status: firstString(row, ["status", "docstatus"]),
    currency,
    grossPay: firstNumber(row, ["gross_pay", "gross_salary", "grossPay"]),
    totalEarnings,
    totalDeductions,
    netPay: firstNumber(row, ["net_pay", "net_salary", "netPay", "rounded_total", "roundedTotal"]),
    earningsRows,
    deductionsRows,
    bankName: firstString(row, ["bank_name", "bank"]),
    iban: firstString(row, ["iban"]),
    bankAccount: firstString(row, ["bank_account", "bank_ac_no", "salary_bank_account"]),
    employeeId: firstString(row, ["employee_id", "employee"]),
    employeeName: firstString(row, ["employee_name"]),
    employeeCode: firstString(row, ["employee_code", "employee_no", "employee_number"]),
    company: firstString(row, ["company"]),
    department: firstString(row, ["department"]),
    designation: firstString(row, ["designation"]),
    employmentType: firstString(row, ["employment_type"]),
  };
}

function logShapeOnce(label: string, value: unknown, alreadyLogged: boolean): boolean {
  if (!__DEV__ || !DEBUG_PAYROLL_SHAPE || alreadyLogged) return alreadyLogged;
  const row = asRecord(value);
  const topKeys = row ? Object.keys(row).slice(0, 40) : [];
  const data = row ? asRecord(row.data) : null;
  const dataKeys = data ? Object.keys(data).slice(0, 40) : [];
  const items = (data?.items as unknown) ?? row?.items;
  const firstItem = Array.isArray(items) && items.length > 0 ? asRecord(items[0]) : null;
  const itemKeys = firstItem ? Object.keys(firstItem).slice(0, 40) : [];
  console.log(`[payroll-shape] ${label}`, { topKeys, dataKeys, itemKeys, itemsCount: Array.isArray(items) ? items.length : 0 });
  return true;
}

function logDetailShapeOnce(value: unknown, alreadyLogged: boolean): boolean {
  if (!__DEV__ || !DEBUG_PAYROLL_DETAIL_SHAPE || alreadyLogged) return alreadyLogged;
  const row = asRecord(value);
  const topKeys = row ? Object.keys(row).slice(0, 40) : [];
  const data = row ? asRecord(row.data) : null;
  const dataKeys = data ? Object.keys(data).slice(0, 40) : [];
  const firstEarning = Array.isArray(data?.earnings)
    ? asRecord(data?.earnings[0])
    : Array.isArray(data?.allowance_rules)
      ? asRecord(data?.allowance_rules[0])
      : null;
  const firstDeduction = Array.isArray(data?.deductions)
    ? asRecord(data?.deductions[0])
    : Array.isArray(data?.deduction_rules)
      ? asRecord(data?.deduction_rules[0])
      : null;
  const numericSummary: Record<string, number | undefined> = {
    gross_pay: toNumber(data?.gross_pay),
    gross_salary: toNumber(data?.gross_salary),
    net_pay: toNumber(data?.net_pay),
    net_salary: toNumber(data?.net_salary),
    total_deduction: toNumber(data?.total_deduction),
    total_deductions: toNumber(data?.total_deductions),
  };
  const periodSummary: Record<string, string | undefined> = {
    start_date: toString(data?.start_date),
    end_date: toString(data?.end_date),
    period_start: toString(data?.period_start),
    period_end: toString(data?.period_end),
    payroll_period: toString(data?.payroll_period),
    month: toString(data?.month),
    salary_month: toString(data?.salary_month),
    posting_date: toString(data?.posting_date),
    payment_date: toString(data?.payment_date),
  };
  console.log("[payroll-detail-shape]", {
    endpoint: "/api/payroll/payslips/:id/print-data",
    topKeys,
    dataKeys,
    firstEarningKeys: firstEarning ? Object.keys(firstEarning).slice(0, 20) : [],
    firstDeductionKeys: firstDeduction ? Object.keys(firstDeduction).slice(0, 20) : [],
    numericSummary,
    periodSummary,
  });
  return true;
}

export const payrollService = {
  async getMyPayrollProfile(): Promise<PayrollProfile | null> {
    const response = await http.get<unknown>("/api/payroll/me");
    loggedProfileShape = logShapeOnce("profile", response.data, loggedProfileShape);
    const top = asRecord(response.data);
    const data = top ? top.data : null;
    return normalizeProfile(data);
  },

  async listMyPayslips(): Promise<PayrollPayslip[]> {
    const response = await http.get<unknown>("/api/payroll/payslips");
    loggedPayslipsShape = logShapeOnce("payslips", response.data, loggedPayslipsShape);
    const top = asRecord(response.data);
    const data = top ? asRecord(top.data) : null;
    const items = Array.isArray(data?.items) ? data?.items : Array.isArray(top?.items) ? top?.items : [];
    if (!Array.isArray(items)) return [];
    return items.map(normalizePayslip).filter((x): x is PayrollPayslip => x !== null);
  },

  async getMyPayslipPrintData(id: string): Promise<PayrollPayslip | null> {
    const safeId = String(id || "").trim();
    if (!safeId) return null;
    const response = await http.get<unknown>(`/api/payroll/payslips/${encodeURIComponent(safeId)}/print-data`);
    loggedPayslipDetailShape = logDetailShapeOnce(response.data, loggedPayslipDetailShape);
    const top = asRecord(response.data);
    const data = top ? top.data : null;
    return normalizePayslip(data);
  },
};
