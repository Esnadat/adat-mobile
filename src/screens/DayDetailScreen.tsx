import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { Ionicons } from "../components/ui/NavIcons";
import { DetailShell } from "../components/ui/DetailShell";
import { StatusPill, StatusPillTone } from "../components/ui/StatusPill";
import { SkeletonList } from "../components/ui/Skeleton";
import { useAppLocale } from "../i18n/LocaleContext";
import { i18n } from "../i18n";
import { attendanceService, dateKeyInTimeZone, RIYADH_TZ } from "../services/attendanceService";
import { requestService } from "../services/requestService";
import { EmployeeCheckinLogRow, EmployeeRequest, MobileWorkCalendarDayStatus } from "../types/api";
import { RootStackParamList } from "../types/navigation";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { shadowSoft } from "../theme/shadows";
import { formatMobileTimeString } from "../utils/mobileDateFormat";

function fmtHM(totalMinutes: number, locale: string): string {
  const n = Math.max(0, Number.isFinite(totalMinutes) ? Math.round(totalMinutes) : 0);
  const h = Math.floor(n / 60);
  const m = n % 60;
  return locale === "ar" ? `${h}س ${m}د` : `${h}h ${m}m`;
}

function longDate(dateKey: string, locale: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusTone(status?: string): StatusPillTone {
  switch (status as MobileWorkCalendarDayStatus) {
    case "complete":
      return "success";
    case "partial":
      return "warning";
    case "absent":
      return "danger";
    default:
      return "neutral";
  }
}

function statusLabel(status?: string): string {
  switch (status as MobileWorkCalendarDayStatus) {
    case "off":
      return i18n.t("statusOff");
    case "scheduled":
      return i18n.t("statusScheduled");
    case "complete":
      return i18n.t("statusComplete");
    case "partial":
      return i18n.t("statusPartial");
    case "absent":
      return i18n.t("statusAbsent");
    default:
      return i18n.t("statusUnresolved");
  }
}

function InfoLine({ label, value, isAr }: { label: string; value: string; isAr: boolean }) {
  const align = isAr ? "right" : "left";
  return (
    <View style={[styles.infoLine, isAr && styles.rowReverse]}>
      <Text style={[styles.infoLabel, { textAlign: align }]}>{label}</Text>
      <Text style={[styles.infoValue, { textAlign: isAr ? "left" : "right" }]}>{value}</Text>
    </View>
  );
}

export function DayDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "DayDetail">>();
  const p = route.params;
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const align = isAr ? "right" : "left";

  const [punches, setPunches] = useState<EmployeeCheckinLogRow[]>([]);
  const [dayRequests, setDayRequests] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [year, month] = useMemo(() => {
    const [y, m] = p.date.split("-").map((x) => Number.parseInt(x, 10));
    return [y, m];
  }, [p.date]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [checkins, requests] = await Promise.all([
        attendanceService.getEmployeeCheckinsForMonth(year, month),
        requestService.getMyRequests().catch(() => [] as EmployeeRequest[]),
      ]);
      const dayPunches = checkins
        .filter((r) => dateKeyInTimeZone(r.time, RIYADH_TZ) === p.date)
        .sort((a, b) => String(a.time).localeCompare(String(b.time)));
      setPunches(dayPunches);
      const related = requests.filter((r) => {
        if (r.type === "leave" && r.fromDate && r.toDate) return p.date >= r.fromDate && p.date <= r.toDate;
        return r.permissionDate === p.date;
      });
      setDayRequests(related);
    } finally {
      setLoading(false);
    }
  }, [year, month, p.date]);

  useEffect(() => {
    void load();
  }, [load]);

  const overtimeMin =
    p.expectedMinutes != null && p.expectedMinutes > 0 && (p.workedMinutes ?? 0) > p.expectedMinutes
      ? (p.workedMinutes ?? 0) - p.expectedMinutes
      : 0;
  const missingMin =
    p.expectedMinutes != null && p.expectedMinutes > 0 && (p.workedMinutes ?? 0) < p.expectedMinutes
      ? p.expectedMinutes - (p.workedMinutes ?? 0)
      : 0;

  return (
    <DetailShell
      title={i18n.t("dayDetailTitle")}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      <View style={styles.card}>
        <View style={[styles.headerRow, isAr && styles.rowReverse]}>
          <Text style={[styles.date, { textAlign: align }]}>{longDate(p.date, locale)}</Text>
          <StatusPill label={statusLabel(p.statusKey)} tone={statusTone(p.statusKey)} numberOfLines={1} />
        </View>

        {p.shiftName ? <InfoLine label={i18n.t("calendarShiftLabel")} value={p.shiftName} isAr={isAr} /> : null}
        {p.startTime && p.endTime ? (
          <InfoLine
            label={i18n.t("dayDetailShiftTime")}
            value={`${formatMobileTimeString(p.startTime, locale)} – ${formatMobileTimeString(p.endTime, locale)}`}
            isAr={isAr}
          />
        ) : null}
        {p.expectedMinutes != null && p.expectedMinutes > 0 ? (
          <InfoLine label={i18n.t("calendarExpectedHours")} value={fmtHM(p.expectedMinutes, locale)} isAr={isAr} />
        ) : null}
        <InfoLine label={i18n.t("calendarActualHours")} value={fmtHM(p.workedMinutes ?? 0, locale)} isAr={isAr} />
        {overtimeMin > 0 ? (
          <InfoLine label={i18n.t("stmtOvertime")} value={`+${fmtHM(overtimeMin, locale)}`} isAr={isAr} />
        ) : null}
        {missingMin > 0 ? (
          <InfoLine label={i18n.t("stmtMissing")} value={`−${fmtHM(missingMin, locale)}`} isAr={isAr} />
        ) : null}
      </View>

      <Text style={[styles.sectionTitle, { textAlign: align }]}>{i18n.t("dayDetailPunches")}</Text>
      {loading ? (
        <SkeletonList count={2} />
      ) : punches.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="finger-print-outline" size={22} color={colors.textMuted} />
          <Text style={styles.emptyText}>{i18n.t("dayDetailNoPunches")}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {punches.map((row, i) => {
            const isIn = String(row.log_type ?? "").toUpperCase() === "IN";
            const timePart = String(row.time ?? "").slice(11, 16);
            return (
              <View key={row.name} style={[styles.punchRow, isAr && styles.rowReverse, i > 0 && styles.punchDivider]}>
                <View style={[styles.punchDot, { backgroundColor: isIn ? colors.success : colors.danger }]} />
                <Text style={[styles.punchType, { color: isIn ? colors.successDark : colors.danger }]}>
                  {isIn ? i18n.t("dayDetailIn") : i18n.t("dayDetailOut")}
                </Text>
                <Text style={styles.punchTime}>{formatMobileTimeString(timePart, locale)}</Text>
              </View>
            );
          })}
        </View>
      )}

      {dayRequests.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { textAlign: align }]}>{i18n.t("calendarRequestsSection")}</Text>
          <View style={styles.card}>
            {dayRequests.map((r, i) => (
              <View key={`${r.type}:${r.id}`} style={[styles.punchRow, isAr && styles.rowReverse, i > 0 && styles.punchDivider]}>
                <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.reqText, { textAlign: align }]} numberOfLines={1}>
                  {`${r.type} · ${r.id}`}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </DetailShell>
  );
}

const styles = StyleSheet.create({
  rowReverse: { flexDirection: "row-reverse" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadowSoft,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.sm },
  date: { flex: 1, fontSize: 15, fontWeight: "800", color: colors.ink, letterSpacing: -0.2 },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  infoLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  infoValue: { flex: 1, fontSize: 14, fontWeight: "800", color: colors.ink, fontVariant: ["tabular-nums"] },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: colors.ink, marginBottom: spacing.md, letterSpacing: -0.1 },
  punchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 10 },
  punchDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  punchDot: { width: 9, height: 9, borderRadius: 5 },
  punchType: { flex: 1, fontSize: 14, fontWeight: "800" },
  punchTime: { fontSize: 15, fontWeight: "800", color: colors.ink, fontVariant: ["tabular-nums"] },
  reqText: { flex: 1, fontSize: 13.5, fontWeight: "600", color: colors.ink },
  emptyBox: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
});
