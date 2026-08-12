import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { EmployeeAvatar } from "../components/ui/EmployeeAvatar";
import { InfoRow } from "../components/ui/InfoRow";
import { PremiumCard } from "../components/ui/PremiumCard";
import { ScreenShell } from "../components/ui/ScreenShell";
import { useAuth } from "../context/AuthContext";
import { useAppLocale } from "../i18n/LocaleContext";
import { i18n } from "../i18n";
import { profileService } from "../services/profileService";
import { colors } from "../theme/colors";
import { floatingTabBarBottomInset } from "../theme/shadows";
import { type as typeStyles } from "../theme/typography";

const TRUSTED_COMPANY_CODE_BY_NAME: Record<string, string> = {
  // Fallback only when backend/session omits a numeric company code.
  esnadat: "1001",
};

function firstNonEmpty(...values: (string | undefined)[]): string {
  for (const value of values) {
    const trimmed = value?.trim() ?? "";
    if (trimmed) return trimmed;
  }
  return "";
}

function normalizeDisplayValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const candidate = firstNonEmpty(
      typeof rec.name === "string" ? rec.name : undefined,
      typeof rec.full_name === "string" ? rec.full_name : undefined,
      typeof rec.employee_name === "string" ? rec.employee_name : undefined,
      typeof rec.value === "string" ? rec.value : undefined,
      typeof rec.label === "string" ? rec.label : undefined
    );
    return candidate.trim();
  }
  return "";
}

export function ProfileScreen() {
  const { user } = useAuth();
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const align = isAr ? "right" : "left";
  const [remoteProfile, setRemoteProfile] = useState<Awaited<ReturnType<typeof profileService.getMyEmployeeProfile>>>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoadingProfile(true);
      try {
        const data = await profileService.getMyEmployeeProfile();
        if (!active) return;
        setRemoteProfile(data);
      } catch {
        if (!active) return;
        // Optional enrichment must never block Profile rendering.
        setRemoteProfile(null);
      } finally {
        if (active) setLoadingProfile(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const displayName = normalizeDisplayValue(firstNonEmpty(remoteProfile?.fullName, user?.name));
  const displayEmail = normalizeDisplayValue(firstNonEmpty(remoteProfile?.workEmail, user?.workEmail, user?.email));
  const rawSessionCompanyDisplay = normalizeDisplayValue(user?.companyDisplay);
  const normalizedSessionCompanyDisplay = rawSessionCompanyDisplay === "إسنادات" ? "Esnadat" : rawSessionCompanyDisplay;
  const rawCompanyCodeCandidate = normalizeDisplayValue(firstNonEmpty(remoteProfile?.companyCode, user?.companyCode));
  const companyNameFromCode =
    /^\d+$/.test(rawCompanyCodeCandidate) || !rawCompanyCodeCandidate ? "" : rawCompanyCodeCandidate;
  const displayCompany = normalizeDisplayValue(
    firstNonEmpty(remoteProfile?.company, normalizedSessionCompanyDisplay, companyNameFromCode)
  );
  const displayEmployeeId = normalizeDisplayValue(firstNonEmpty(remoteProfile?.employeeId, user?.id));
  const mappedCompanyCode = TRUSTED_COMPANY_CODE_BY_NAME[displayCompany.toLowerCase()] || "";
  const normalizedCompanyCode = /^\d+$/.test(rawCompanyCodeCandidate) ? rawCompanyCodeCandidate : mappedCompanyCode;
  const shouldShowCompanyCode =
    Boolean(normalizedCompanyCode) &&
    normalizedCompanyCode.trim().toLowerCase() !== displayCompany.trim().toLowerCase();
  const displayCompanyCode = normalizeDisplayValue(shouldShowCompanyCode ? normalizedCompanyCode : "");
  const displayDesignation = normalizeDisplayValue(firstNonEmpty(remoteProfile?.designation, user?.designation));
  const displayDepartment = normalizeDisplayValue(firstNonEmpty(remoteProfile?.department, user?.department));
  const displayManager = normalizeDisplayValue(firstNonEmpty(remoteProfile?.manager, user?.manager));
  const displayBranch = normalizeDisplayValue(firstNonEmpty(remoteProfile?.branch, user?.branch));
  const displayStatus = normalizeDisplayValue(firstNonEmpty(remoteProfile?.status, user?.status));
  const displayJoiningDate = normalizeDisplayValue(firstNonEmpty(remoteProfile?.dateOfJoining, user?.dateOfJoining));
  const displayEmploymentType = normalizeDisplayValue(firstNonEmpty(remoteProfile?.employmentType, user?.employmentType));
  const displayMobile = normalizeDisplayValue(firstNonEmpty(remoteProfile?.mobile, user?.mobile));
  const displayPersonalEmail = normalizeDisplayValue(firstNonEmpty(remoteProfile?.personalEmail, user?.personalEmail));
  const uniquePersonalEmail = displayPersonalEmail.toLowerCase() === displayEmail.toLowerCase() ? "" : displayPersonalEmail;
  const initialSource = displayName || displayEmail || "E";
  const avatarUrl = remoteProfile?.photoUrl || user?.employeePhotoUrl;

  const basicRows = useMemo(
    () =>
      [
        { label: i18n.t("employeeId"), value: displayEmployeeId },
        { label: i18n.t("name"), value: displayName },
        { label: isAr ? "الحالة" : "Status", value: displayStatus },
        { label: isAr ? "نوع التوظيف" : "Employment Type", value: displayEmploymentType },
      ].filter((row) => Boolean(row.value)),
    [displayEmployeeId, displayName, displayStatus, displayEmploymentType, isAr]
  );

  const orgRows = useMemo(
    () =>
      [
        { label: i18n.t("company"), value: displayCompany },
        { label: isAr ? "رمز الشركة" : "Company Code", value: displayCompanyCode },
        { label: isAr ? "القسم" : "Department", value: displayDepartment },
        { label: isAr ? "المسمى الوظيفي" : "Designation", value: displayDesignation },
        { label: isAr ? "الفرع" : "Branch", value: displayBranch },
        { label: isAr ? "تاريخ الانضمام" : "Date of Joining", value: displayJoiningDate },
        { label: isAr ? "المدير المباشر" : "Manager", value: displayManager },
      ].filter((row) => Boolean(row.value)),
    [
      displayCompany,
      displayCompanyCode,
      displayDepartment,
      displayDesignation,
      displayBranch,
      displayJoiningDate,
      displayManager,
      isAr,
    ]
  );

  const contactRows = useMemo(
    () =>
      [
        { label: isAr ? "البريد الوظيفي" : "Work Email", value: displayEmail },
        { label: isAr ? "الجوال" : "Mobile", value: displayMobile },
        { label: isAr ? "البريد الشخصي" : "Personal Email", value: uniquePersonalEmail },
      ].filter((row) => Boolean(row.value)),
    [displayEmail, displayMobile, uniquePersonalEmail, isAr]
  );

  return (
    <ScreenShell
      key={locale}
      title={i18n.t("profileTab")}
      hideHeader
      headerDensity="compact"
      contentContainerStyle={{ paddingTop: 14, paddingBottom: floatingTabBarBottomInset + 10 }}
    >
      <PremiumCard hero style={styles.businessCard}>
        <View style={styles.cardAccent} />
        <View style={[styles.businessHead, isAr ? styles.rowReverse : styles.rowNormal]}>
          <View style={styles.avatarRing}>
            <EmployeeAvatar photoUrl={avatarUrl} initialSource={initialSource} size={78} />
          </View>
          <View style={[styles.identityTextCol, { alignItems: isAr ? "flex-end" : "flex-start" }]}>
            {displayName ? <Text style={[styles.heroName, isAr && styles.noTrack, { textAlign: align }]}>{displayName}</Text> : null}
            {displayCompany ? (
              <Text style={[styles.heroCompany, isAr && styles.noTrack, { textAlign: align }]} numberOfLines={2}>
                {displayCompany}
              </Text>
            ) : null}
            {displayDesignation ? (
              <Text style={[styles.heroTag, { textAlign: align }]} numberOfLines={1}>
                {displayDesignation}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.metaRow, isAr ? styles.rowReverse : styles.rowNormal]}>
          {displayEmployeeId ? (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>{isAr ? "الرقم الوظيفي" : "Employee ID"}</Text>
              <Text style={styles.badgeTxt}>{displayEmployeeId}</Text>
            </View>
          ) : null}
          {displayCompanyCode ? (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>{isAr ? "رمز الشركة" : "Company Code"}</Text>
              <Text style={styles.badgeTxt}>{displayCompanyCode}</Text>
            </View>
          ) : null}
        </View>
      </PremiumCard>

      <PremiumCard style={styles.details}>
        {loadingProfile ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.successDark} />
          </View>
        ) : null}
        <Text style={[styles.blockTitle, { textAlign: align }]}>
          {isAr ? "جميع بيانات الموظف" : "All Employee Details"}
        </Text>
        {basicRows.length > 0 ? (
          <>
            <Text style={[styles.groupTitle, { textAlign: align }]}>{isAr ? "البيانات الأساسية" : "Basic Information"}</Text>
            {basicRows.map((row) => (
              <InfoRow key={row.label} label={row.label} value={row.value} isAr={isAr} />
            ))}
          </>
        ) : null}
        {orgRows.length > 0 ? (
          <>
            <Text style={[styles.groupTitle, styles.groupGap, { textAlign: align }]}>{isAr ? "بيانات المؤسسة" : "Organization"}</Text>
            {orgRows.map((row) => (
              <InfoRow key={row.label} label={row.label} value={row.value} isAr={isAr} />
            ))}
          </>
        ) : null}
        {contactRows.length > 0 ? (
          <>
            <Text style={[styles.groupTitle, styles.groupGap, { textAlign: align }]}>{isAr ? "بيانات الاتصال" : "Contact"}</Text>
            {contactRows.map((row) => (
              <InfoRow key={row.label} label={row.label} value={row.value} isAr={isAr} />
            ))}
          </>
        ) : null}
      </PremiumCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  rowNormal: { flexDirection: "row" },
  rowReverse: { flexDirection: "row-reverse" },
  businessCard: {
    marginBottom: 12,
    borderColor: colors.borderStrong,
    paddingVertical: 14,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.success,
  },
  businessHead: {
    alignItems: "center",
    gap: 12,
  },
  identityTextCol: { flex: 1, minWidth: 0 },
  avatarRing: {
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(13, 138, 78, 0.26)",
    overflow: "hidden",
  },
  heroName: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.35,
    lineHeight: 24,
    marginBottom: 2,
  },
  noTrack: { letterSpacing: 0 },
  heroCompany: {
    fontSize: typeStyles.label.fontSize,
    fontWeight: "700",
    color: colors.textSecondary,
    lineHeight: typeStyles.label.lineHeight,
    marginBottom: 3,
  },
  heroEmail: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    lineHeight: 17,
  },
  heroPhone: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 17,
    marginTop: 1,
  },
  heroMeta: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 1,
  },
  heroTag: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.successDark,
    lineHeight: 15,
    marginBottom: 1,
  },
  metaRow: { marginTop: 12, gap: 8 },
  badge: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 2,
  },
  badgeTxt: { fontSize: 12, fontWeight: "800", color: colors.ink, fontVariant: ["tabular-nums"] },
  details: { marginBottom: 14, paddingVertical: 2, paddingBottom: 8, paddingHorizontal: 14 },
  loadingRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.successDark,
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  groupGap: { marginTop: 8 },
});
