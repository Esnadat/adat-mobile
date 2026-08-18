import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Ionicons } from "../components/ui/NavIcons";
import { buildPayslipHtml } from "../utils/payslipHtml";
import { MoneyRow } from "../components/ui/MoneyRow";
import { PremiumCard } from "../components/ui/PremiumCard";
import { StatusPill } from "../components/ui/StatusPill";
import { i18n } from "../i18n";
import { useAppLocale } from "../i18n/LocaleContext";
import { PayrollLineItem, payrollService, PayrollPayslip, PayrollProfile } from "../services/payrollService";
import { colors } from "../theme/colors";
import { floatingTabBarBottomInset } from "../theme/shadows";
import { type as typeStyles } from "../theme/typography";
import { formatIsoDateForDisplay, formatYyyyMmDdForDisplay } from "../utils/mobileDateFormat";

function money(value: number | undefined, currency?: string): string {
  if (value == null || !Number.isFinite(value)) return i18n.t("notAvailable");
  const safeCurrency = currency?.trim() || "SAR";
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: safeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function isUuidLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());
}

function payslipCardTitle(item: PayrollPayslip): string {
  const ref = item.reference?.trim();
  if (ref && !isUuidLike(ref)) return ref;
  return i18n.t("payslipDefaultTitle");
}

function shortenId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.length > 8 ? `${trimmed.slice(0, 8)}…` : trimmed;
}

function payslipStatusTone(raw?: string): "success" | "warning" | "danger" | "neutral" {
  const s = (raw || "").toLowerCase();
  if (s.includes("paid") || s.includes("مدفوع")) return "success";
  if (s.includes("unpaid") || s.includes("reject")) return "danger";
  if (s.includes("draft")) return "neutral";
  if (s.includes("submit") || s.includes("approv")) return "success";
  return "neutral";
}

function payslipStatusLabel(raw?: string): string {
  const s = (raw || "").toLowerCase();
  if (!s) return i18n.t("notAvailable");
  if (s.includes("paid")) return i18n.t("payslipPaid");
  if (s.includes("unpaid")) return i18n.t("payslipUnpaid");
  if (s.includes("draft")) return i18n.t("payslipDraft");
  if (s.includes("submit") || s.includes("approv")) return i18n.t("payslipSubmitted");
  return raw?.trim() || i18n.t("notAvailable");
}

function safeDate(value?: string): string | null {
  if (!value) return null;
  return formatYyyyMmDdForDisplay(value) || formatIsoDateForDisplay(value);
}

function maskIban(iban?: string): string {
  const raw = (iban || "").replace(/\s+/g, "").trim();
  if (!raw) return "";
  if (raw.length <= 8) return raw;
  return `${raw.slice(0, 4)} **** **** ${raw.slice(-4)}`;
}

function maskAccount(account?: string): string {
  const raw = (account || "").replace(/\s+/g, "").trim();
  if (!raw) return "";
  if (raw.length <= 4) return raw;
  return `****${raw.slice(-4)}`;
}

function infoRow(label: string, value: string | undefined): { label: string; value: string } | null {
  const v = (value || "").trim();
  if (!v) return null;
  return { label, value: v };
}

function payslipPeriod(item: PayrollPayslip): string {
  if (item.periodLabel?.trim()) return item.periodLabel.trim();
  const start = safeDate(item.periodStart);
  const end = safeDate(item.periodEnd);
  if (start && end) return `${start}  —  ${end}`;
  return start || end || "";
}

function labelForLine(item: PayrollLineItem): string {
  return item.label.trim() || i18n.t("notAvailable");
}

function PayslipItem({
  item,
  isAr,
  onPress,
  active = false,
}: {
  item: PayrollPayslip;
  isAr: boolean;
  onPress?: () => void;
  active?: boolean;
}) {
  const title = payslipCardTitle(item);
  const stLabel = payslipStatusLabel(item.status);
  const tone = payslipStatusTone(item.status);
  const textAlign = isAr ? "right" : "left";
  const refLine =
    item.reference?.trim() && isUuidLike(item.reference)
      ? item.reference
      : isUuidLike(item.id)
        ? item.id
        : item.reference?.trim() || item.id;
  const showCompactId = Boolean(refLine && isUuidLike(refLine));
  const compactIdLabel = isAr ? "رقم القسيمة" : "Payslip ID";
  const paymentDate = safeDate(item.paymentDate || item.postingDate);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [ps.row, isAr && ps.rowAr, active && ps.rowActive, pressed && onPress ? ps.rowPressed : null]}
    >
      <View style={ps.left}>
        <Text style={[ps.title, { textAlign }]}>{title}</Text>
        <StatusPill label={stLabel} tone={tone} numberOfLines={1} />
        <Text style={[ps.meta, { textAlign }]}>{`${i18n.t("payrollPeriod")}: ${payslipPeriod(item)}`}</Text>
        {paymentDate ? (
          <Text style={[ps.meta, { textAlign }]}>{`${isAr ? "تاريخ الدفع" : "Payment Date"}: ${paymentDate}`}</Text>
        ) : null}
        {item.totalDeductions != null ? (
          <Text style={[ps.meta, { textAlign }]}>{`${i18n.t("totalDeductions")}: ${money(item.totalDeductions, item.currency)}`}</Text>
        ) : null}
        {showCompactId ? (
          <Text style={[ps.refMuted, { textAlign }, isAr && ps.refLtr]} numberOfLines={1}>
            {`${compactIdLabel}: ${shortenId(refLine || "")}`}
          </Text>
        ) : null}
      </View>
      <Text style={[ps.amount, isAr && ps.amountLtr]}>{money(item.netPay, item.currency)}</Text>
    </Pressable>
  );
}

export function PayrollScreen() {
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const [printing, setPrinting] = useState(false);

  const printPayslip = useCallback(
    async (slip: PayrollPayslip) => {
      if (printing) return;
      setPrinting(true);
      try {
        // Generate a PDF, then open the OS share sheet (Print / Save to Files / AirDrop
        // on iOS). More reliable than Print.printAsync's direct dialog. Falls back to
        // the print dialog if sharing is unavailable.
        const html = buildPayslipHtml(slip, isAr);
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: i18n.t("printPayslip") });
        } else {
          await Print.printAsync({ uri });
        }
      } catch {
        Alert.alert(i18n.t("printPayslipError"));
      } finally {
        setPrinting(false);
      }
    },
    [isAr, printing]
  );
  const [profile, setProfile] = useState<PayrollProfile | null>(null);
  const [payslips, setPayslips] = useState<PayrollPayslip[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [latestDetail, setLatestDetail] = useState<PayrollPayslip | null>(null);
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PayrollPayslip | null>(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const detailInFlightRef = useRef(false);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (mountedRef.current) {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
    }
    try {
      const [profileData, payslipsData] = await Promise.all([
        payrollService.getMyPayrollProfile(),
        payrollService.listMyPayslips(),
      ]);
      if (!mountedRef.current) return;
      setProfile(profileData);
      setPayslips(payslipsData);
    } catch {
      if (!mountedRef.current) return;
      setError(i18n.t("payrollUnavailable"));
    } finally {
      inFlightRef.current = false;
      if (!mountedRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load("initial");
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const loadPayslipDetail = useCallback(
    async (id: string, target: "latest" | "selected") => {
      const safeId = String(id || "").trim();
      if (!safeId || detailInFlightRef.current) return;
      detailInFlightRef.current = true;
      if (mountedRef.current) setDetailError(null);
      try {
        const detail = await payrollService.getMyPayslipPrintData(safeId);
        if (!mountedRef.current) return;
        if (target === "latest") setLatestDetail(detail);
        else setSelectedDetail(detail);
      } catch {
        if (!mountedRef.current) return;
        setDetailError(isAr ? "تعذر تحميل تفاصيل القسيمة؛ يتم عرض البيانات المتاحة." : "Could not load payslip detail; showing available data.");
      } finally {
        detailInFlightRef.current = false;
      }
    },
    [isAr]
  );

  const sortedPayslips = [...payslips].sort((a, b) => {
    const aDate = Date.parse(a.paymentDate || a.postingDate || a.periodEnd || a.periodStart || "");
    const bDate = Date.parse(b.paymentDate || b.postingDate || b.periodEnd || b.periodStart || "");
    const aTs = Number.isNaN(aDate) ? 0 : aDate;
    const bTs = Number.isNaN(bDate) ? 0 : bDate;
    return bTs - aTs;
  });
  const latestListSlip = sortedPayslips[0] || null;

  useEffect(() => {
    const latestId = latestListSlip?.id?.trim();
    if (!latestId) {
      setLatestDetail(null);
      return;
    }
    void loadPayslipDetail(latestId, "latest");
  }, [latestListSlip?.id, loadPayslipDetail]);

  const primarySlip = latestDetail || latestListSlip || null;
  const summaryCurrency = primarySlip?.currency || profile?.currency || "SAR";
  const usedProfileNetFallback = primarySlip?.netPay == null && profile?.netSalary != null;
  const summaryNet = primarySlip?.netPay ?? profile?.netSalary;
  const effectiveFrom = safeDate(primarySlip?.periodStart || profile?.effectiveFrom);
  const effectiveTo = safeDate(primarySlip?.periodEnd || profile?.effectiveTo);
  const periodLabel = primarySlip?.periodLabel?.trim() || "";
  const periodLine =
    effectiveFrom && effectiveTo
      ? `${effectiveFrom}  —  ${effectiveTo}`
      : effectiveFrom || effectiveTo || periodLabel || (isAr ? "الفترة غير متاحة من المصدر" : "Period unavailable from source");
  const paymentDate = safeDate(primarySlip?.paymentDate || primarySlip?.postingDate);
  const statusLabel = payslipStatusLabel(primarySlip?.status);
  const statusTone = payslipStatusTone(primarySlip?.status);
  const employeeRows = [
    infoRow(i18n.t("name"), primarySlip?.employeeName || profile?.employeeName),
    infoRow(i18n.t("employeeId"), primarySlip?.employeeCode || profile?.employeeCode || primarySlip?.employeeId || profile?.employeeId),
    infoRow(i18n.t("company"), primarySlip?.company || profile?.company),
    infoRow(isAr ? "القسم" : "Department", primarySlip?.department || profile?.department),
    infoRow(isAr ? "المسمى الوظيفي" : "Designation", primarySlip?.designation || profile?.designation),
    infoRow(isAr ? "نوع التوظيف" : "Employment Type", primarySlip?.employmentType || profile?.employmentType),
  ].filter((x): x is { label: string; value: string } => x !== null);
  const bankName = primarySlip?.bankName || profile?.bankName;
  const iban = primarySlip?.iban || profile?.iban;
  const bankAccount = primarySlip?.bankAccount || profile?.bankAccount;
  const paymentMethod = profile?.paymentMethod;
  const bankRows = [
    infoRow(isAr ? "اسم البنك" : "Bank Name", bankName),
    infoRow(isAr ? "IBAN" : "IBAN", maskIban(iban)),
    infoRow(isAr ? "رقم الحساب" : "Bank Account", maskAccount(bankAccount)),
    infoRow(isAr ? "طريقة الدفع" : "Payment Method", paymentMethod),
  ].filter((x): x is { label: string; value: string } => x !== null);
  const earningRows: PayrollLineItem[] =
    primarySlip?.earningsRows.length
      ? primarySlip.earningsRows
      : [
          { label: i18n.t("basicSalary"), amount: profile?.basicSalary, type: "earning" as const },
          { label: i18n.t("housingAllowance"), amount: profile?.housingAllowance, type: "earning" as const },
          { label: i18n.t("transportAllowance"), amount: profile?.transportAllowance, type: "earning" as const },
          { label: i18n.t("otherAllowances"), amount: profile?.otherAllowances, type: "earning" as const },
        ].filter((x) => x.amount != null && Number.isFinite(x.amount));
  const deductionsRows = primarySlip?.deductionsRows || [];
  const totalEarnings = primarySlip?.totalEarnings ?? profile?.totalEarnings;
  const totalDeductions = primarySlip?.totalDeductions ?? profile?.totalDeductions;
  const showDeductionsHint = deductionsRows.length === 0 && totalDeductions != null;
  const showDeductionsMissingFromSource =
    Boolean(primarySlip) && deductionsRows.length === 0 && primarySlip?.totalDeductions == null;
  const showDeductionsCard = deductionsRows.length > 0 || totalDeductions != null || showDeductionsMissingFromSource;

  return (
    <ScrollView
      style={styles.outer}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load("refresh")}
          tintColor={colors.primary}
          enabled={!loading}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {error ? (
        <PremiumCard style={styles.errCard}>
          <Text style={styles.errorText}>{error}</Text>
        </PremiumCard>
      ) : null}
      {detailError ? (
        <PremiumCard style={styles.warnCard}>
          <Text style={styles.warnText}>{detailError}</Text>
        </PremiumCard>
      ) : null}

      <PremiumCard hero tinted style={styles.summary}>
        <View style={styles.summaryAccent} />
        <Text style={[styles.netLabel, { textAlign: isAr ? "right" : "left" }]}>{i18n.t("payrollNetSummary")}</Text>
        <Text style={[styles.netAmt, isAr && styles.netAmtLtr]}>{money(summaryNet, summaryCurrency)}</Text>
        {usedProfileNetFallback ? (
          <Text style={[styles.hintText, { textAlign: isAr ? "right" : "left" }]}>
            {isAr ? "من ملف الراتب" : "From payroll profile"}
          </Text>
        ) : null}
        {periodLine ? (
          <Text style={[styles.period, { textAlign: isAr ? "right" : "left" }, isAr && styles.periodLtr]}>
            {i18n.t("payrollPeriod")}: {periodLine}
          </Text>
        ) : null}
        {paymentDate ? (
          <Text style={[styles.period, { textAlign: isAr ? "right" : "left" }, isAr && styles.periodLtr]}>
            {`${isAr ? "تاريخ الدفع" : "Payment Date"}: ${paymentDate}`}
          </Text>
        ) : null}
        {primarySlip?.status ? (
          <View style={styles.summaryStatusRow}>
            <StatusPill label={statusLabel} tone={statusTone} numberOfLines={1} />
          </View>
        ) : null}
        {summaryCurrency ? (
          <Text style={[styles.period, { textAlign: isAr ? "right" : "left" }]}>{`${isAr ? "العملة" : "Currency"}: ${summaryCurrency}`}</Text>
        ) : null}
      </PremiumCard>

      {employeeRows.length > 0 ? (
        <PremiumCard style={styles.breakCard}>
          <Text style={[styles.cardHead, { textAlign: isAr ? "right" : "left" }]}>{isAr ? "بيانات الموظف" : "Employee Information"}</Text>
          {employeeRows.map((row) => (
            <View key={row.label} style={[styles.infoRow, isAr && styles.infoRowAr]}>
              <Text style={[styles.infoLabel, { textAlign: isAr ? "right" : "left" }]}>{row.label}</Text>
              <Text style={[styles.infoValue, isAr && styles.periodLtr]}>{row.value}</Text>
            </View>
          ))}
        </PremiumCard>
      ) : null}

      {bankRows.length > 0 ? (
        <PremiumCard style={styles.breakCard}>
          <Text style={[styles.cardHead, { textAlign: isAr ? "right" : "left" }]}>{isAr ? "بيانات التحويل البنكي" : "Bank Transfer"}</Text>
          {bankRows.map((row) => (
            <View key={row.label} style={[styles.infoRow, isAr && styles.infoRowAr]}>
              <Text style={[styles.infoLabel, { textAlign: isAr ? "right" : "left" }]}>{row.label}</Text>
              <Text style={[styles.infoValue, isAr && styles.periodLtr]}>{row.value}</Text>
            </View>
          ))}
        </PremiumCard>
      ) : null}

      {(earningRows.length > 0 || totalEarnings != null) ? (
        <PremiumCard style={styles.breakCard}>
          <Text style={[styles.cardHead, { textAlign: isAr ? "right" : "left" }]}>{isAr ? "الاستحقاقات" : "Earnings"}</Text>
          {earningRows.map((row) => (
            <MoneyRow key={`${labelForLine(row)}-${row.amount ?? "na"}`} label={labelForLine(row)} amount={money(row.amount, summaryCurrency)} isAr={isAr} />
          ))}
          {totalEarnings != null ? <MoneyRow label={isAr ? "إجمالي الاستحقاقات" : "Total Earnings"} amount={money(totalEarnings, summaryCurrency)} emphasize isAr={isAr} /> : null}
        </PremiumCard>
      ) : null}

      {showDeductionsCard ? (
        <PremiumCard style={styles.breakCard}>
          <Text style={[styles.cardHead, { textAlign: isAr ? "right" : "left" }]}>{isAr ? "الاستقطاعات" : "Deductions"}</Text>
          {deductionsRows.map((row) => (
            <MoneyRow key={`${row.label}-${row.amount ?? "na"}`} label={labelForLine(row)} amount={money(row.amount, summaryCurrency)} isAr={isAr} />
          ))}
          {totalDeductions != null ? <MoneyRow label={i18n.t("totalDeductions")} amount={money(totalDeductions, summaryCurrency)} emphasize isAr={isAr} /> : null}
          {showDeductionsHint ? (
            <Text style={[styles.hintText, { textAlign: isAr ? "right" : "left" }]}>
              {isAr ? "لا توجد تفاصيل استقطاعات من المصدر الحالي" : "Detailed deductions are not available from current source"}
            </Text>
          ) : null}
          {showDeductionsMissingFromSource ? (
            <Text style={[styles.hintText, { textAlign: isAr ? "right" : "left" }]}>
              {isAr ? "لم يرسل المصدر إجمالي الاستقطاعات" : "Deduction total not provided by source"}
            </Text>
          ) : null}
        </PremiumCard>
      ) : null}

      <PremiumCard style={styles.breakCard}>
        <Text style={[styles.cardHead, { textAlign: isAr ? "right" : "left" }]}>{i18n.t("payslips")}</Text>
        {payslips.length === 0 ? (
          <Text style={[styles.emptyText, { textAlign: isAr ? "right" : "left" }]}>{i18n.t("noPayslips")}</Text>
        ) : (
          sortedPayslips.map((item) => (
            <PayslipItem
              key={item.id}
              item={item}
              isAr={isAr}
              active={item.id === selectedPayslipId}
              onPress={() => {
                const id = item.id.trim();
                setSelectedPayslipId(id);
                setSelectedDetail(item);
                void loadPayslipDetail(id, "selected");
              }}
            />
          ))
        )}
      </PremiumCard>

      {selectedDetail ? (
        <PremiumCard style={styles.breakCard}>
          <Text style={[styles.cardHead, { textAlign: isAr ? "right" : "left" }]}>
            {isAr ? "تفاصيل القسيمة" : "Payslip Detail"}
          </Text>
          <MoneyRow label={i18n.t("netSalary")} amount={money(selectedDetail.netPay, selectedDetail.currency || summaryCurrency)} emphasize isAr={isAr} />
          {selectedDetail.grossPay != null ? (
            <MoneyRow label={isAr ? "إجمالي الراتب" : "Gross Pay"} amount={money(selectedDetail.grossPay, selectedDetail.currency || summaryCurrency)} isAr={isAr} />
          ) : null}
          {selectedDetail.totalDeductions != null ? (
            <MoneyRow label={i18n.t("totalDeductions")} amount={money(selectedDetail.totalDeductions, selectedDetail.currency || summaryCurrency)} isAr={isAr} />
          ) : null}
          {selectedDetail.earningsRows.length > 0 ? (
            <Text style={[styles.subHead, { textAlign: isAr ? "right" : "left" }]}>{isAr ? "الاستحقاقات" : "Earnings"}</Text>
          ) : null}
          {selectedDetail.earningsRows.map((row) => (
            <MoneyRow key={`sel-e-${row.label}-${row.amount ?? "na"}`} label={labelForLine(row)} amount={money(row.amount, selectedDetail.currency || summaryCurrency)} isAr={isAr} />
          ))}
          {selectedDetail.deductionsRows.length > 0 ? (
            <Text style={[styles.subHead, { textAlign: isAr ? "right" : "left" }]}>{isAr ? "الاستقطاعات" : "Deductions"}</Text>
          ) : null}
          {selectedDetail.deductionsRows.map((row) => (
            <MoneyRow key={`sel-d-${row.label}-${row.amount ?? "na"}`} label={labelForLine(row)} amount={money(row.amount, selectedDetail.currency || summaryCurrency)} isAr={isAr} />
          ))}
          <Pressable
            accessibilityRole="button"
            disabled={printing}
            onPress={() => void printPayslip(selectedDetail)}
            style={({ pressed }) => [styles.printBtn, isAr && { flexDirection: "row-reverse" }, pressed && { opacity: 0.9 }, printing && { opacity: 0.6 }]}
          >
            <Ionicons name="print-outline" size={17} color={colors.primary} />
            <Text style={styles.printBtnText}>{i18n.t("printPayslip")}</Text>
          </Pressable>
        </PremiumCard>
      ) : null}
    </ScrollView>
  );
}

const ps = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowAr: { flexDirection: "row-reverse" },
  rowActive: { backgroundColor: colors.surfaceSubtle },
  rowPressed: { opacity: 0.92 },
  left: { flex: 1, paddingEnd: 12 },
  title: { fontSize: 15, fontWeight: "800", color: colors.ink, marginBottom: 8, letterSpacing: -0.15, lineHeight: 21 },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 5, fontWeight: "600", lineHeight: 17 },
  refMuted: { fontSize: 11, color: colors.textMuted, fontFamily: "monospace", marginTop: 6, fontWeight: "500" },
  refLtr: { writingDirection: "ltr" },
  amount: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  amountLtr: { writingDirection: "ltr" },
});

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, paddingTop: 12, paddingBottom: floatingTabBarBottomInset + 24 },
  errCard: {
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(211, 47, 47, 0.2)",
    borderStartWidth: 3,
    borderStartColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  warnCard: {
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(183, 133, 0, 0.3)",
    backgroundColor: "#FFF8E1",
  },
  warnText: {
    color: "#7A5A00",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "700",
    lineHeight: 18,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "700",
    lineHeight: 20,
  },
  summary: { marginBottom: 18, alignItems: "flex-start", paddingVertical: 4 },
  summaryAccent: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginBottom: 12,
  },
  netLabel: {
    ...typeStyles.caption,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  netAmt: {
    fontSize: 34,
    fontWeight: "900",
    color: colors.primaryDark,
    fontVariant: ["tabular-nums"],
    marginBottom: 12,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  netAmtLtr: { writingDirection: "ltr" },
  period: { fontSize: 12, fontWeight: "600", color: colors.textMuted, fontVariant: ["tabular-nums"], lineHeight: 18 },
  periodLtr: { writingDirection: "ltr" },
  summaryStatusRow: { marginTop: 8, marginBottom: 2 },
  breakCard: { marginBottom: 18, paddingVertical: 6, paddingBottom: 14 },
  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  printBtnText: { fontSize: 14, fontWeight: "800", color: colors.primary },
  cardHead: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    letterSpacing: -0.2,
  },
  emptyText: { fontSize: 14, color: colors.textMuted, paddingVertical: 12, fontWeight: "600", lineHeight: 20 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoRowAr: { flexDirection: "row-reverse" },
  infoLabel: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  infoValue: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.ink, textAlign: "right" },
  hintText: { fontSize: 12, color: colors.textMuted, marginTop: 8, lineHeight: 18, fontWeight: "600" },
  subHead: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark,
    marginTop: 10,
    marginBottom: 4,
  },
});
