import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { EmployeeAvatar } from "../components/ui/EmployeeAvatar";
import { PremiumCard } from "../components/ui/PremiumCard";
import { Ionicons } from "../components/ui/NavIcons";
import { useAuth } from "../context/AuthContext";
import { useAppLocale } from "../i18n/LocaleContext";
import { colors } from "../theme/colors";
import { floatingTabBarBottomInset } from "../theme/shadows";
import { formatMobileDate, formatMobileTimeFromDate } from "../utils/mobileDateFormat";
import { formatYyyyMmDdForDisplay } from "../utils/mobileDateFormat";

const ESNADAT_NAME = "Esnadat";
const ESNADAT_CODE = "1001";
const ACTIVE_STATUS = new Set(["active", "enabled", "نشط"]);
const INACTIVE_STATUS = new Set(["inactive", "disabled", "غير نشط"]);

function normalizeDisplayValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const candidates = [
      typeof rec.name === "string" ? rec.name : undefined,
      typeof rec.full_name === "string" ? rec.full_name : undefined,
      typeof rec.employee_name === "string" ? rec.employee_name : undefined,
      typeof rec.value === "string" ? rec.value : undefined,
      typeof rec.label === "string" ? rec.label : undefined,
    ];
    for (const candidate of candidates) {
      const trimmed = candidate?.trim() ?? "";
      if (trimmed) return trimmed;
    }
  }
  return "";
}

function firstNonEmpty(...values: (string | undefined)[]): string {
  for (const value of values) {
    const trimmed = normalizeDisplayValue(value);
    if (trimmed) return trimmed;
  }
  return "";
}

type StatusBadgeInfo = {
  text: string;
  active: boolean;
};

type CompanyInfo = {
  display: string;
  code: string;
  isEsnadat: boolean;
};

function mapStatusBadge(rawStatus: string, isAr: boolean): StatusBadgeInfo | null {
  const normalized = rawStatus.trim().toLowerCase();
  if (!normalized) return null;
  if (ACTIVE_STATUS.has(normalized)) {
    return { text: isAr ? "نشط" : "Active", active: true };
  }
  if (INACTIVE_STATUS.has(normalized)) {
    return { text: isAr ? "غير نشط" : "Inactive", active: false };
  }
  return null;
}

function isNumeric(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

function resolveCompany(user: unknown): CompanyInfo {
  const rec = (user && typeof user === "object" ? (user as Record<string, unknown>) : {}) ?? {};
  const displayFromPriority = firstNonEmpty(
    normalizeDisplayValue(rec.companyDisplay),
    normalizeDisplayValue(rec.companyName),
    normalizeDisplayValue(rec.company)
  );
  const rawCompanyCode = firstNonEmpty(
    normalizeDisplayValue(rec.companyCode),
    normalizeDisplayValue(rec.company_code),
    normalizeDisplayValue((rec.company as Record<string, unknown> | undefined)?.code)
  );
  const nonNumericCompanyCodeAsDisplay = !isNumeric(rawCompanyCode) ? rawCompanyCode : "";
  const display = firstNonEmpty(displayFromPriority, nonNumericCompanyCodeAsDisplay);
  const isEsnadat = display.toLowerCase() === "esnadat" || rawCompanyCode === ESNADAT_CODE;
  const code = isNumeric(rawCompanyCode) ? rawCompanyCode : isEsnadat ? ESNADAT_CODE : "";
  return { display, code, isEsnadat };
}

function escapeVCardValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildVCard(fields: {
  name: string;
  companyDisplay: string;
  designation: string;
  department: string;
  workEmail: string;
  mobile: string;
  employeeId: string;
  companyCode: string;
}): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  if (fields.name) lines.push(`FN:${escapeVCardValue(fields.name)}`);
  if (fields.companyDisplay) lines.push(`ORG:${escapeVCardValue(fields.companyDisplay)}`);
  if (fields.designation) lines.push(`TITLE:${escapeVCardValue(fields.designation)}`);
  if (fields.workEmail) lines.push(`EMAIL:${escapeVCardValue(fields.workEmail)}`);
  if (fields.mobile) lines.push(`TEL:${escapeVCardValue(fields.mobile)}`);
  const noteParts = [
    fields.department ? `Department ${fields.department}` : "",
    fields.employeeId ? `Employee ID ${fields.employeeId}` : "",
    fields.companyCode ? `Company Code ${fields.companyCode}` : "",
  ].filter(Boolean);
  if (noteParts.length > 0) lines.push(`NOTE:${escapeVCardValue(noteParts.join(" | "))}`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

export function BusinessCardScreen() {
  const { user } = useAuth();
  const { locale } = useAppLocale();
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const isAr = locale === "ar";
  const align = isAr ? "right" : "left";

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(t);
  }, []);

  const name = firstNonEmpty(user?.name, user?.email);
  const designation = firstNonEmpty(user?.designation);
  const department = firstNonEmpty(user?.department);
  const workEmail = firstNonEmpty(user?.workEmail, user?.email);
  const personalEmail = firstNonEmpty(user?.personalEmail);
  const showPersonalEmail = personalEmail && personalEmail.toLowerCase() !== workEmail.toLowerCase();
  const mobile = firstNonEmpty(user?.mobile);
  const employeeId = firstNonEmpty(user?.id);
  const joining = firstNonEmpty(user?.dateOfJoining);
  const statusValue = firstNonEmpty(user?.status);
  const statusBadge = mapStatusBadge(statusValue, isAr);
  const company = resolveCompany(user);
  const avatarSource = firstNonEmpty(name, workEmail, company.display, ESNADAT_NAME);
  const photoUrl = user?.employeePhotoUrl;
  const qrPayload = useMemo(
    () =>
      buildVCard({
        name,
        companyDisplay: company.display,
        designation,
        department,
        workEmail,
        mobile,
        employeeId,
        companyCode: company.code,
      }),
    [name, company.display, designation, department, workEmail, mobile, employeeId, company.code]
  );

  const compactInfoRows = useMemo(
    () =>
      [
        { icon: "mail-outline" as const, value: workEmail },
        { icon: "call-outline" as const, value: mobile },
        { icon: "person-outline" as const, value: employeeId ? `ID ${employeeId}` : "" },
        { icon: "business-outline" as const, value: company.code ? `Code ${company.code}` : "" },
        {
          icon: "calendar-outline" as const,
          value: joining ? `${isAr ? "التعيين" : "Joined"} ${formatYyyyMmDdForDisplay(joining) ?? ""}` : "",
        },
        { icon: "at-outline" as const, value: showPersonalEmail ? personalEmail : "" },
      ].filter((row) => Boolean(row.value)),
    [workEmail, mobile, employeeId, company.code, showPersonalEmail, personalEmail, joining, isAr]
  );

  return (
    <ScrollView style={styles.outer} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.contentHeader, isAr && styles.rowReverse]}>
        <Text style={styles.contentTitle}>{isAr ? "بطاقة العمل" : "Business Card"}</Text>
        <Pressable disabled style={styles.shareGhostBtn}>
          <Ionicons name="share-social-outline" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
      <PremiumCard hero style={styles.card}>
        <View style={styles.cardTopAccent} />
        <View style={[styles.topRow, isAr && styles.rowReverse]}>
          <View style={styles.brandWrap}>
            {company.isEsnadat && !logoLoadFailed ? (
              <Image
                source={require("../../assets/branding/esnadat-wordmark.png")}
                style={styles.brandWordmark}
                resizeMode="contain"
                onError={() => setLogoLoadFailed(true)}
              />
            ) : company.display ? (
              <Text style={styles.brandFallback}>{company.display}</Text>
            ) : null}
          </View>
          <View style={styles.avatarWrap}>
            <EmployeeAvatar photoUrl={photoUrl} initialSource={avatarSource} size={100} />
          </View>
        </View>
        <View style={[styles.arIdentityBlock, { alignItems: isAr ? "flex-end" : "flex-start" }]}>
          {statusBadge ? (
            <View style={[styles.statusBadge, statusBadge.active ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
              <Text style={[styles.statusBadgeText, statusBadge.active ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive]}>
                {statusBadge.text}
              </Text>
            </View>
          ) : null}
          {name ? <Text style={[styles.arName, { textAlign: align }]}>{name}</Text> : null}
          {designation ? <Text style={[styles.arDesignation, { textAlign: align }]}>{designation}</Text> : null}
          {department ? <Text style={[styles.arDepartment, { textAlign: align }]}>{department}</Text> : null}
          <View style={[styles.dateTimeStrip, isAr && styles.rowReverse]}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.dateTimeText}>{`${formatMobileDate(now)} · ${formatMobileTimeFromDate(now, locale)}`}</Text>
          </View>
        </View>
        <View style={[styles.midRow, isAr && styles.rowReverse]}>
          <View style={styles.qrArea}>
            <View style={styles.qrBox}>
              <QRCode value={qrPayload} size={100} quietZone={8} />
            </View>
            <Text style={styles.qrLabel}>{isAr ? "امسح لعرض البطاقة" : "Scan to view card"}</Text>
          </View>
          <View style={[styles.enIdentityBlock, { alignItems: isAr ? "flex-end" : "flex-start" }]}>
            {name ? <Text style={[styles.enName, { textAlign: align }]}>{name}</Text> : null}
            {designation ? <Text style={[styles.enRole, { textAlign: align }]}>{designation}</Text> : null}
            {department ? <Text style={[styles.enSub, { textAlign: align }]}>{department}</Text> : null}
            {company.display ? <Text style={[styles.enSub, styles.enCompany, { textAlign: align }]}>{company.display}</Text> : null}
          </View>
        </View>
        <View style={styles.infoArea}>
          {compactInfoRows.map((row) => (
            <View key={`${row.icon}-${row.value}`} style={[styles.infoChip, isAr && styles.rowReverse]}>
              <Ionicons name={row.icon} size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, isAr && styles.infoTextRtl]} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.decorativeBand}>
          <View style={styles.waveOne} />
          <View style={styles.waveTwo} />
          <View style={styles.dotRow}>
            {Array.from({ length: 9 }).map((_, idx) => (
              <View key={`dot-${idx}`} style={styles.bandDot} />
            ))}
          </View>
        </View>
        <View style={[styles.footerRow, isAr && styles.rowReverse]}>
          {company.display ? <Text style={styles.footerBrand}>{company.display}</Text> : <View />}
          {company.code ? <Text style={styles.footerText}>{`Code ${company.code}`}</Text> : employeeId ? <Text style={styles.footerText}>{`ID ${employeeId}`}</Text> : null}
        </View>
      </PremiumCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, paddingTop: 8, paddingBottom: floatingTabBarBottomInset + 24 },
  contentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  contentTitle: { fontSize: 14, fontWeight: "800", color: colors.ink, letterSpacing: -0.1 },
  shareGhostBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    minHeight: 540,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
  },
  cardTopAccent: { width: 100, height: 4, borderRadius: 2, backgroundColor: colors.success, marginBottom: 12 },
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  rowReverse: { flexDirection: "row-reverse" },
  brandWrap: { minHeight: 34, justifyContent: "center" },
  brandWordmark: { width: 138, height: 26, opacity: 0.92 },
  brandFallback: { fontSize: 18, fontWeight: "900", color: colors.ink, letterSpacing: -0.2 },
  avatarWrap: {
    borderRadius: 56,
    borderWidth: 2,
    borderColor: "rgba(13, 138, 78, 0.28)",
    padding: 2,
    backgroundColor: colors.surface,
  },
  arIdentityBlock: { marginBottom: 14 },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: "rgba(13, 138, 78, 0.12)",
    borderColor: "rgba(13, 138, 78, 0.28)",
  },
  statusBadgeInactive: {
    backgroundColor: "rgba(97, 106, 115, 0.12)",
    borderColor: "rgba(97, 106, 115, 0.24)",
  },
  statusBadgeText: { fontSize: 11, fontWeight: "800" },
  statusBadgeTextActive: { color: colors.successDark },
  statusBadgeTextInactive: { color: colors.textSecondary },
  arName: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.ink,
    lineHeight: 34,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  arDesignation: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.successDark,
    lineHeight: 20,
  },
  arDepartment: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    lineHeight: 18,
  },
  dateTimeStrip: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  dateTimeText: { fontSize: 12, fontWeight: "700", color: colors.textMuted, fontVariant: ["tabular-nums"] },
  midRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  qrArea: { alignItems: "center", justifyContent: "center" },
  qrBox: {
    width: 118,
    height: 118,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  qrLabel: { marginTop: 6, fontSize: 11, fontWeight: "700", color: colors.textMuted },
  enIdentityBlock: { flex: 1, minWidth: 0 },
  enName: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.ink,
    lineHeight: 23,
    marginBottom: 2,
  },
  enRole: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, lineHeight: 18 },
  enSub: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, lineHeight: 17 },
  enCompany: { color: colors.ink, fontWeight: "800", marginTop: 2 },
  infoArea: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  infoText: {
    maxWidth: 228,
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
  },
  infoTextRtl: { textAlign: "right" },
  decorativeBand: {
    position: "relative",
    height: 60,
    borderRadius: 16,
    backgroundColor: "rgba(13, 138, 78, 0.08)",
    marginBottom: 10,
    overflow: "hidden",
  },
  waveOne: {
    position: "absolute",
    width: 210,
    height: 100,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "rgba(13, 138, 78, 0.22)",
    bottom: -58,
    left: -18,
    transform: [{ rotate: "-8deg" }],
  },
  waveTwo: {
    position: "absolute",
    width: 190,
    height: 90,
    borderRadius: 54,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    bottom: -54,
    left: 42,
    transform: [{ rotate: "5deg" }],
  },
  dotRow: { position: "absolute", right: 14, top: 14, flexDirection: "row", gap: 6 },
  bandDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(13, 138, 78, 0.32)" },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  footerBrand: { fontSize: 13, fontWeight: "800", color: colors.ink },
  footerText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
});
