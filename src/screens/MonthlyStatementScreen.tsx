import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "../components/ui/NavIcons";
import { EmployeeAvatar } from "../components/ui/EmployeeAvatar";
import { StatTile } from "../components/ui/StatTile";
import { StatusPill, StatusPillTone } from "../components/ui/StatusPill";
import { useAuth } from "../context/AuthContext";
import { useAppLocale } from "../i18n/LocaleContext";
import { i18n } from "../i18n";
import { loadMonthlyStatement, MonthlyStatement, StatementDay } from "../services/attendanceStatement";
import { MobileWorkCalendarDayStatus } from "../types/api";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { floatingTabBarBottomInset, shadowSoft } from "../theme/shadows";

const RIYADH_TZ = "Asia/Riyadh";

/** Latin-digit safe: month name + full year (numerals always English per brand). */
function monthTitle(year: number, month1: number, locale: string): string {
  const d = new Date(year, month1 - 1, 1);
  const name = d.toLocaleDateString(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US", { month: "long" });
  return `${name} ${year}`;
}

function weekdayShort(dateKey: string, locale: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US", { weekday: "short" });
}

/** "Xh Ym" / "Xس Yد" — JS number interpolation keeps digits Latin. */
function fmtHM(totalMinutes: number, locale: string): string {
  const n = Math.max(0, Number.isFinite(totalMinutes) ? Math.round(totalMinutes) : 0);
  const h = Math.floor(n / 60);
  const m = n % 60;
  return locale === "ar" ? `${h}س ${m}د` : `${h}h ${m}m`;
}

function statusTone(status: MobileWorkCalendarDayStatus): StatusPillTone {
  switch (status) {
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

function statusLabel(status: MobileWorkCalendarDayStatus): string {
  switch (status) {
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

/** Date-badge colors mirror the calendar status visuals (single-accent friendly). */
function badgeVisual(status: MobileWorkCalendarDayStatus): { fill: string; text: string; ring: string } {
  switch (status) {
    case "complete":
      return { fill: colors.successLight, text: colors.successDark, ring: colors.success };
    case "partial":
      return { fill: colors.warningLight, text: colors.warning, ring: colors.warning };
    case "absent":
      return { fill: colors.dangerLight, text: colors.danger, ring: colors.danger };
    default:
      return { fill: colors.surfaceSubtle, text: colors.textSecondary, ring: colors.border };
  }
}

function riyadhNow(): { year: number; month1: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: RIYADH_TZ, year: "numeric", month: "2-digit" }).formatToParts(
    new Date()
  );
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  return { year: Number.isFinite(y) ? y : new Date().getFullYear(), month1: Number.isFinite(m) ? m : new Date().getMonth() + 1 };
}

function DayRecord({ day, locale, isAr }: { day: StatementDay; locale: string; isAr: boolean }) {
  const vis = badgeVisual(day.status);
  const align = isAr ? "right" : "left";
  const showColumns = day.isWorkDay && (day.status === "complete" || day.status === "partial" || day.status === "absent");
  return (
    <View style={styles.dayCard}>
      <View style={[styles.dayRow, isAr && styles.rowReverse]}>
        <View style={[styles.dateBadge, { backgroundColor: vis.fill, borderColor: vis.ring }]}>
          <Text style={[styles.badgeWeekday, { color: vis.text }]} numberOfLines={1}>
            {weekdayShort(day.date, locale)}
          </Text>
          <Text style={[styles.badgeDay, { color: vis.text }]}>{day.dayNumber}</Text>
        </View>

        <View style={styles.dayBody}>
          <View style={[styles.dayHeaderRow, isAr && styles.rowReverse]}>
            <StatusPill label={statusLabel(day.status)} tone={statusTone(day.status)} numberOfLines={1} />
          </View>

          {showColumns ? (
            <View style={[styles.metricsRow, isAr && styles.rowReverse]}>
              <View style={styles.metricCol}>
                <Text style={[styles.metricLabel, { textAlign: align }]}>{i18n.t("stmtOvertime")}</Text>
                <Text
                  style={[styles.metricValue, { textAlign: align, color: day.overtimeMinutes > 0 ? colors.successDark : colors.textMuted }]}
                >
                  {day.overtimeMinutes > 0 ? fmtHM(day.overtimeMinutes, locale) : "—"}
                </Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricCol}>
                <Text style={[styles.metricLabel, { textAlign: align }]}>{i18n.t("stmtMissing")}</Text>
                <Text
                  style={[styles.metricValue, { textAlign: align, color: day.missingMinutes > 0 ? colors.danger : colors.textMuted }]}
                >
                  {day.missingMinutes > 0 ? fmtHM(day.missingMinutes, locale) : "—"}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.dayOffHint, { textAlign: align }]}>
              {day.status === "off" ? i18n.t("stmtRestDay") : i18n.t("stmtNoSchedule")}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

export function MonthlyStatementScreen() {
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const align = isAr ? "right" : "left";
  const { user } = useAuth();

  const initial = useMemo(() => riyadhNow(), []);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month1);
  const [statement, setStatement] = useState<MonthlyStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCurrentMonth = year === initial.year && month === initial.month1;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadMonthlyStatement(year, month);
      setStatement(result);
    } catch {
      setError(i18n.t("stmtLoadError"));
      setStatement(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const goPrev = () => {
    setMonth((m) => (m === 1 ? 12 : m - 1));
    if (month === 1) setYear((y) => y - 1);
  };
  const goNext = () => {
    if (isCurrentMonth) return;
    setMonth((m) => (m === 12 ? 1 : m + 1));
    if (month === 12) setYear((y) => y + 1);
  };

  const records = useMemo(() => (statement?.days ?? []).filter((d) => !d.isFuture).reverse(), [statement]);

  const displayName = (user?.name || user?.email || "").trim();
  const employeeId = (user?.id || "").trim();
  const line2 = [user?.designation, user?.department || user?.branch].filter((x) => Boolean(x && String(x).trim())).join(" · ");

  return (
    <ScrollView
      style={styles.outer}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      {/* Employee identity hero */}
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={[styles.heroRow, isAr && styles.rowReverse]}>
          <EmployeeAvatar photoUrl={user?.employeePhotoUrl} initialSource={displayName || employeeId || "?"} size={54} />
          <View style={styles.heroText}>
            <Text style={[styles.heroName, { textAlign: align }]} numberOfLines={1}>
              {displayName || i18n.t("employee")}
            </Text>
            {employeeId ? (
              <Text style={[styles.heroSub, { textAlign: align }]} numberOfLines={1}>
                {`${i18n.t("employeeId")}  ${employeeId}`}
              </Text>
            ) : null}
            {line2 ? (
              <Text style={[styles.heroSub, { textAlign: align }]} numberOfLines={1}>
                {line2}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Month selector */}
      <View style={[styles.monthBar, isAr && styles.rowReverse]}>
        <Pressable
          onPress={isAr ? goNext : goPrev}
          disabled={isAr ? isCurrentMonth : false}
          hitSlop={10}
          style={({ pressed }) => [styles.monthNav, pressed && styles.pressed, isAr && isCurrentMonth && styles.navDisabled]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.monthTitle} numberOfLines={1}>
          {monthTitle(year, month, locale)}
        </Text>
        <Pressable
          onPress={isAr ? goPrev : goNext}
          disabled={isAr ? false : isCurrentMonth}
          hitSlop={10}
          style={({ pressed }) => [styles.monthNav, pressed && styles.pressed, !isAr && isCurrentMonth && styles.navDisabled]}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.ink} />
        </Pressable>
      </View>

      {/* Month stat tiles */}
      <View style={styles.statsRow}>
        <StatTile
          tone="success"
          isAr={isAr}
          icon={<Ionicons name="checkmark-circle" size={20} color={colors.successDark} />}
          value={statement?.presentCount ?? 0}
          label={i18n.t("stmtPresent")}
        />
        <StatTile
          tone="warning"
          isAr={isAr}
          icon={<Ionicons name="alert-circle" size={20} color={colors.warning} />}
          value={statement?.incompleteCount ?? 0}
          label={i18n.t("stmtIncomplete")}
        />
        <StatTile
          tone="danger"
          isAr={isAr}
          icon={<Ionicons name="close-circle" size={20} color={colors.danger} />}
          value={statement?.absentCount ?? 0}
          label={i18n.t("stmtAbsent")}
        />
      </View>

      {/* Totals strip */}
      {statement ? (
        <View style={[styles.totalsRow, isAr && styles.rowReverse]}>
          <View style={styles.totalItem}>
            <Text style={[styles.totalLabel, { textAlign: align }]}>{i18n.t("stmtWorkedTotal")}</Text>
            <Text style={[styles.totalValue, { textAlign: align }]}>{fmtHM(statement.totalWorkedMinutes, locale)}</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={[styles.totalLabel, { textAlign: align }]}>{i18n.t("stmtOvertimeTotal")}</Text>
            <Text style={[styles.totalValue, { textAlign: align, color: colors.successDark }]}>
              {fmtHM(statement.totalOvertimeMinutes, locale)}
            </Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={[styles.totalLabel, { textAlign: align }]}>{i18n.t("stmtMissingTotal")}</Text>
            <Text style={[styles.totalValue, { textAlign: align, color: statement.totalMissingMinutes > 0 ? colors.danger : colors.ink }]}>
              {fmtHM(statement.totalMissingMinutes, locale)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Daily records */}
      <Text style={[styles.sectionTitle, { textAlign: align }]}>{i18n.t("stmtDailyLog")}</Text>

      {loading && !statement ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : records.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="calendar-outline" size={26} color={colors.textMuted} />
          <Text style={styles.emptyText}>{i18n.t("stmtEmpty")}</Text>
        </View>
      ) : (
        records.map((day) => <DayRecord key={day.date} day={day} locale={locale} isAr={isAr} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: floatingTabBarBottomInset + spacing.md },
  rowReverse: { flexDirection: "row-reverse" },
  pressed: { opacity: 0.85 },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    overflow: "hidden",
    marginBottom: spacing.lg,
    ...shadowSoft,
  },
  heroGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(22, 163, 74, 0.10)",
    top: -60,
    right: -26,
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  heroText: { flex: 1, gap: 3 },
  heroName: { fontSize: 17, fontWeight: "800", color: colors.ink, letterSpacing: -0.2 },
  heroSub: { fontSize: 12.5, fontWeight: "600", color: colors.textSecondary },

  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  monthNav: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  navDisabled: { opacity: 0.35 },
  monthTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "800", color: colors.ink, letterSpacing: -0.2 },

  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },

  totalsRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    ...shadowSoft,
  },
  totalItem: { flex: 1, gap: 3 },
  totalLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  totalValue: { fontSize: 15, fontWeight: "800", color: colors.ink, fontVariant: ["tabular-nums"] },

  sectionTitle: { fontSize: 14, fontWeight: "800", color: colors.ink, marginBottom: spacing.md, letterSpacing: -0.1 },

  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadowSoft,
  },
  dayRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dateBadge: {
    width: 52,
    height: 56,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  badgeWeekday: { fontSize: 11, fontWeight: "700" },
  badgeDay: { fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: -0.3 },
  dayBody: { flex: 1, gap: spacing.sm },
  dayHeaderRow: { flexDirection: "row", alignItems: "center" },
  metricsRow: { flexDirection: "row", alignItems: "center" },
  metricCol: { flex: 1, gap: 2 },
  metricDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: colors.divider, marginHorizontal: spacing.md },
  metricLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  metricValue: { fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  dayOffHint: { fontSize: 12.5, fontWeight: "600", color: colors.textMuted },

  center: { paddingVertical: spacing.xxxl, alignItems: "center" },
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(198,40,40,0.2)",
    padding: spacing.lg,
  },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 19 },
  emptyBox: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxxl },
  emptyText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
});
