import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "../components/ui/NavIcons";
import { PremiumCard } from "../components/ui/PremiumCard";
import { ScreenShell } from "../components/ui/ScreenShell";
import { StatTile } from "../components/ui/StatTile";
import { Skeleton } from "../components/ui/Skeleton";
import { useAppLocale } from "../i18n/LocaleContext";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/navigation";
import { i18n } from "../i18n";
import {
  attendanceService,
  dateKeyInTimeZone,
  expectedMinutesFromShiftTimes,
  RIYADH_TZ,
  workedMinutesFromCheckinsSameDay,
} from "../services/attendanceService";
import { calendarService } from "../services/calendarService";
import { getApiErrorMessage } from "../services/http";
import {
  CalendarEventType,
  CalendarOverlayEvent,
  EmployeeCheckinLogRow,
  MobileWorkCalendarDay,
  MobileWorkCalendarDayStatus,
  WorkScheduleMonthDay,
  WorkScheduleMonthPayload,
} from "../types/api";
import { colors } from "../theme/colors";
import { floatingTabBarBottomInset, shadowCard } from "../theme/shadows";

const CELL_W = 42;
const STATUS_ORDER: MobileWorkCalendarDayStatus[] = ["off", "scheduled", "complete", "partial", "absent", "unresolved"];
const OVERLAY_DOT_MAX = 2;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function resolveExpectedMinutesForDay(day: WorkScheduleMonthDay | null | undefined): number | null {
  if (!day || day.is_work_day !== true) return null;
  const em = day.expected_minutes;
  if (typeof em === "number" && em > 0) return em;
  return expectedMinutesFromShiftTimes(day.start_time, day.end_time);
}

function computeDayStatus(
  dateKey: string,
  todayKey: string,
  scheduleDay: WorkScheduleMonthDay | null | undefined,
  workedMinutes: number,
  expectedMinutes: number | null
): MobileWorkCalendarDayStatus {
  const isWorkDay = scheduleDay?.is_work_day;
  if (isWorkDay === false) return "off";

  if (dateKey > todayKey) {
    return isWorkDay === true ? "scheduled" : "off";
  }

  if (isWorkDay !== true) return "unresolved";
  if (expectedMinutes == null || expectedMinutes <= 0) return "unresolved";
  if (workedMinutes <= 0) return "absent";
  if (workedMinutes < expectedMinutes) return "partial";
  return "complete";
}

function buildWorkedByDate(checkins: EmployeeCheckinLogRow[], tz: string): Map<string, number> {
  const byDay = new Map<string, EmployeeCheckinLogRow[]>();
  for (const row of checkins) {
    const key = dateKeyInTimeZone(row.time, tz);
    if (!key) continue;
    const arr = byDay.get(key);
    if (arr) arr.push(row);
    else byDay.set(key, [row]);
  }

  const out = new Map<string, number>();
  for (const [key, rows] of byDay) {
    const sorted = [...rows].sort((a, b) => String(a.time).localeCompare(String(b.time)));
    out.set(key, workedMinutesFromCheckinsSameDay(sorted));
  }
  return out;
}

function buildMonthGrid(
  year: number,
  month1: number,
  scheduleByDate: Map<string, WorkScheduleMonthDay | null>,
  workedByDate: Map<string, number>,
  todayKey: string
): MobileWorkCalendarDay[] {
  const lastDay = new Date(year, month1, 0).getDate();
  const first = new Date(year, month1 - 1, 1);
  const startWeekday = first.getDay();
  const cells: MobileWorkCalendarDay[] = [];

  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(year, month1 - 1, 1 - (startWeekday - i));
    const date = ymd(d);
    const scheduleDay = scheduleByDate.get(date) ?? null;
    const workedMinutes = Math.max(0, workedByDate.get(date) ?? 0);
    const expectedMinutes = resolveExpectedMinutesForDay(scheduleDay);
    cells.push({
      date,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      scheduleDay,
      workedMinutes,
      expectedMinutes,
      status: computeDayStatus(date, todayKey, scheduleDay, workedMinutes, expectedMinutes),
    });
  }

  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month1 - 1, day);
    const date = ymd(d);
    const scheduleDay = scheduleByDate.get(date) ?? null;
    const workedMinutes = Math.max(0, workedByDate.get(date) ?? 0);
    const expectedMinutes = resolveExpectedMinutesForDay(scheduleDay);
    cells.push({
      date,
      dayNumber: day,
      isCurrentMonth: true,
      scheduleDay,
      workedMinutes,
      expectedMinutes,
      status: computeDayStatus(date, todayKey, scheduleDay, workedMinutes, expectedMinutes),
    });
  }

  let nextExtra = 1;
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month1, nextExtra);
    const date = ymd(d);
    const scheduleDay = scheduleByDate.get(date) ?? null;
    const workedMinutes = Math.max(0, workedByDate.get(date) ?? 0);
    const expectedMinutes = resolveExpectedMinutesForDay(scheduleDay);
    cells.push({
      date,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      scheduleDay,
      workedMinutes,
      expectedMinutes,
      status: computeDayStatus(date, todayKey, scheduleDay, workedMinutes, expectedMinutes),
    });
    nextExtra += 1;
  }

  return cells;
}

type StatusVisual = {
  ring: string;
  fill: string;
  text: string;
  dot: string;
};

function statusVisual(status: MobileWorkCalendarDayStatus): StatusVisual {
  switch (status) {
    case "off":
      return { ring: colors.border, fill: colors.surfaceSubtle, text: colors.textMuted, dot: colors.textMuted };
    case "scheduled":
      return { ring: colors.ink, fill: colors.surfaceSubtle, text: colors.ink, dot: colors.ink };
    case "complete":
      return { ring: colors.success, fill: colors.successLight, text: colors.successDark, dot: colors.success };
    case "partial":
      return { ring: "#C27803", fill: "#FFF4E0", text: "#7A4A08", dot: "#D97706" };
    case "absent":
      return { ring: colors.danger, fill: colors.dangerLight, text: colors.danger, dot: colors.danger };
    case "unresolved":
    default:
      return { ring: colors.border, fill: colors.surface, text: colors.textSecondary, dot: colors.textMuted };
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
    case "unresolved":
    default:
      return i18n.t("statusUnresolved");
  }
}

function eventTypeColor(type: CalendarEventType): string {
  switch (type) {
    case "task":
      return colors.successDark;
    case "announcement":
      return colors.ink;
    case "holiday":
      return "#0F9D86";
    case "leave":
      return "#111111";
    case "permission":
      return "#F97316";
    default:
      return colors.textMuted;
  }
}

function eventTypeLabel(type: CalendarEventType): string {
  switch (type) {
    case "task":
      return i18n.t("calendarEventTask");
    case "announcement":
      return i18n.t("calendarEventAnnouncement");
    case "holiday":
      return i18n.t("calendarEventHoliday");
    case "leave":
      return i18n.t("calendarEventLeave");
    case "permission":
      return i18n.t("calendarEventPermission");
    default:
      return type;
  }
}

function isApprovedLeaveStatus(raw: string | null | undefined): boolean {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  return s === "approved" || s === "معتمد";
}

function localizeStatusLabel(raw: string | null | undefined): string | null {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  if (key === "pending") return i18n.t("requestStatusPending");
  if (key === "open") return i18n.t("taskStatusOpen");
  if (key === "in_progress") return i18n.t("taskStatusInProgress");
  if (key === "approved") return i18n.t("requestStatusApproved");
  if (key === "rejected") return i18n.t("requestStatusRejected");
  if (key === "cancelled") return i18n.t("requestStatusCancelled");
  if (key === "completed") return i18n.t("taskStatusCompleted");
  return String(raw).trim() || i18n.t("eventStatusUnknown");
}

function localizePriorityLabel(raw: string | null | undefined): string | null {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  if (key === "high" || key === "urgent") return i18n.t("announcementPriorityHigh");
  if (key === "normal" || key === "medium") return i18n.t("announcementPriorityNormal");
  if (key === "low") return i18n.t("announcementPriorityLow");
  return String(raw).trim() || null;
}

function buildEventDisplay(event: CalendarOverlayEvent): { title: string; subtitle: string | null } {
  const statusLabel = localizeStatusLabel(event.status);
  const priorityLabel = localizePriorityLabel(event.priority);

  if (event.type === "leave") {
    const title = eventTypeLabel("leave");
    const subtitle = [event.subtitle, statusLabel].filter(Boolean).join(" · ") || statusLabel;
    return { title, subtitle: subtitle || null };
  }
  if (event.type === "permission") {
    const title = eventTypeLabel("permission");
    const subtitle = [event.subtitle, statusLabel].filter(Boolean).join(" · ") || statusLabel;
    return { title, subtitle: subtitle || null };
  }
  if (event.type === "task") {
    const title = String(event.title || "").trim() || eventTypeLabel("task");
    const subtitle = [statusLabel, priorityLabel].filter(Boolean).join(" · ");
    return { title, subtitle: subtitle || null };
  }
  if (event.type === "announcement") {
    const title = String(event.title || "").trim() || eventTypeLabel("announcement");
    const rawSub = String(event.subtitle ?? "").trim();
    const cleanedSub = rawSub && rawSub !== "0" ? rawSub : null;
    return { title, subtitle: cleanedSub || priorityLabel || null };
  }
  if (event.type === "holiday") {
    const title = String(event.title || "").trim() || eventTypeLabel("holiday");
    return { title, subtitle: eventTypeLabel("holiday") };
  }
  return { title: String(event.title || "").trim(), subtitle: null };
}

function weekdayLabels(locale: string): string[] {
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(2023, 0, 1 + i);
    labels.push(d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { weekday: "short" }));
  }
  return labels;
}

function formatMonthTitle(year: number, month1: number, locale: string): string {
  const d = new Date(year, month1 - 1, 1);
  const name = d.toLocaleDateString(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US", { month: "long" });
  return `${name} (${month1})`;
}

function formatMinutes(totalMinutes: number, locale: string): string {
  const normalized = Math.max(0, Number.isFinite(totalMinutes) ? Math.round(totalMinutes) : 0);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return locale === "ar" ? `${h}س ${m}د` : `${h}h ${m}m`;
}

function formatDateLabel(dateKey: string, locale: string): string {
  const dt = new Date(`${dateKey}T00:00:00`);
  return dt.toLocaleDateString(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function LegendChip({ status, isAr }: { status: MobileWorkCalendarDayStatus; isAr: boolean }) {
  const vis = statusVisual(status);
  return (
    <View style={[styles.legendChip, isAr && styles.legendChipAr, { borderColor: vis.ring, backgroundColor: vis.fill }]}>
      <View style={[styles.legendDot, { backgroundColor: vis.dot }]} />
      <Text style={[styles.legendText, { color: vis.text }]}>{statusLabel(status)}</Text>
    </View>
  );
}

export function CalendarScreen() {
  const { locale } = useAppLocale();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isAr = locale === "ar";
  const rowDir: "row" | "row-reverse" = isAr ? "row-reverse" : "row";
  const textAlign = isAr ? "right" : "left";

  const initialAnchor = useMemo(() => new Date(), []);
  const [cursorYear, setCursorYear] = useState(initialAnchor.getFullYear());
  const [cursorMonth, setCursorMonth] = useState(initialAnchor.getMonth() + 1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedulePayload, setSchedulePayload] = useState<WorkScheduleMonthPayload | null>(null);
  const [checkins, setCheckins] = useState<EmployeeCheckinLogRow[]>([]);
  const [overlayEvents, setOverlayEvents] = useState<CalendarOverlayEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadMonth = useCallback(async (year: number, month: number, mode: "full" | "refresh") => {
    if (mode === "full") setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [schedule, logs] = await Promise.all([
        attendanceService.getWorkScheduleMonth(year, month),
        attendanceService.getEmployeeCheckinsForMonth(year, month),
      ]);
      setSchedulePayload(schedule);
      setCheckins(logs);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setSchedulePayload(null);
      setCheckins([]);
    }

    try {
      const events = await calendarService.getCalendarOverlaysForMonth(year, month);
      setOverlayEvents(events);
    } catch (e) {
      if (__DEV__) {
        console.warn("[calendar-overlays] failed:", getApiErrorMessage(e));
      }
      setOverlayEvents([]);
    } finally {
      if (mode === "full") setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMonth(cursorYear, cursorMonth, "full");
  }, [cursorYear, cursorMonth, loadMonth]);

  const todayKey = dateKeyInTimeZone(new Date().toISOString(), RIYADH_TZ) ?? ymd(new Date());
  const workedByDate = useMemo(() => buildWorkedByDate(checkins, RIYADH_TZ), [checkins]);

  const overlaysByDate = useMemo(() => {
    const map = new Map<string, CalendarOverlayEvent[]>();
    for (const event of overlayEvents) {
      const arr = map.get(event.date);
      if (arr) arr.push(event);
      else map.set(event.date, [event]);
    }
    return map;
  }, [overlayEvents]);

  const scheduleByDate = useMemo(() => {
    const map = new Map<string, WorkScheduleMonthDay | null>();
    const items = schedulePayload?.items;
    if (!Array.isArray(items)) return map;
    for (const it of items) {
      if (!it?.date) continue;
      map.set(String(it.date), it);
    }
    return map;
  }, [schedulePayload]);

  const grid = useMemo(
    () => buildMonthGrid(cursorYear, cursorMonth, scheduleByDate, workedByDate, todayKey),
    [cursorYear, cursorMonth, scheduleByDate, workedByDate, todayKey]
  );

  const monthDays = useMemo(() => grid.filter((d) => d.isCurrentMonth), [grid]);

  const monthSummary = useMemo(() => {
    let present = 0;
    let incomplete = 0;
    let absent = 0;
    for (const d of monthDays) {
      if (d.status === "complete") present += 1;
      else if (d.status === "partial") incomplete += 1;
      else if (d.status === "absent") absent += 1;
    }
    return { present, incomplete, absent };
  }, [monthDays]);

  useEffect(() => {
    if (monthDays.length === 0) {
      setSelectedDate(null);
      return;
    }

    const hasSelected = selectedDate != null && monthDays.some((d) => d.date === selectedDate);
    if (hasSelected) return;

    const todayInMonth = monthDays.find((d) => d.date === todayKey);
    setSelectedDate((todayInMonth ?? monthDays[0]).date);
  }, [monthDays, selectedDate, todayKey]);

  const selectedDay = useMemo(() => {
    if (!selectedDate) return null;
    return grid.find((d) => d.date === selectedDate) ?? null;
  }, [grid, selectedDate]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return overlaysByDate.get(selectedDate) ?? [];
  }, [overlaysByDate, selectedDate]);
  const selectedAnnouncements = useMemo(
    () => selectedDayEvents.filter((e) => e.type === "announcement"),
    [selectedDayEvents]
  );
  const selectedTasks = useMemo(
    () => selectedDayEvents.filter((e) => e.type === "task"),
    [selectedDayEvents]
  );
  const selectedRequests = useMemo(
    () => selectedDayEvents.filter((e) => e.type === "leave" || e.type === "permission"),
    [selectedDayEvents]
  );
  const selectedHolidays = useMemo(
    () => selectedDayEvents.filter((e) => e.type === "holiday"),
    [selectedDayEvents]
  );

  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);
  const monthTitle = useMemo(() => formatMonthTitle(cursorYear, cursorMonth, locale), [cursorYear, cursorMonth, locale]);

  const shiftMonth = (delta: number) => {
    const d = new Date(cursorYear, cursorMonth - 1 + delta, 1);
    setCursorYear(d.getFullYear());
    setCursorMonth(d.getMonth() + 1);
  };

  const unavailable =
    !loading && !error && schedulePayload && (!Array.isArray(schedulePayload.items) || schedulePayload.items.length === 0);

  const showGrid = !loading && !error && !unavailable;

  return (
    <ScreenShell
      title={i18n.t("calendarTitle")}
      subtitle={i18n.t("calendarSubtitle")}
      headerDensity="compact"
      contentContainerStyle={{ paddingBottom: floatingTabBarBottomInset + 10 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadMonth(cursorYear, cursorMonth, "refresh")} />}
    >
      <PremiumCard hero style={styles.controlsCard}>
        <View style={[styles.controlsRow, { flexDirection: rowDir }]}> 
          <Pressable
            accessibilityRole="button"
            onPress={() => shiftMonth(-1)}
            style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
          >
            <Ionicons name={isAr ? "chevron-forward" : "chevron-back"} size={18} color={colors.ink} />
          </Pressable>

          <View style={styles.monthBlock}>
            <Text style={[styles.monthTitle, { textAlign }]}>{monthTitle}</Text>
            <Text style={[styles.monthCaption, { textAlign }]}>{i18n.t("calendarWorkCaption")}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => shiftMonth(1)}
            style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
          >
            <Ionicons name={isAr ? "chevron-back" : "chevron-forward"} size={18} color={colors.ink} />
          </Pressable>
        </View>
      </PremiumCard>

      {schedulePayload?.work_schedule_name ? (
        <PremiumCard style={styles.scheduleCard}>
          <Text style={[styles.scheduleLabel, { textAlign }]}>{i18n.t("workScheduleTitle")}</Text>
          <Text style={[styles.scheduleValue, { textAlign }]}>{String(schedulePayload.work_schedule_name)}</Text>
        </PremiumCard>
      ) : null}

      {loading ? (
        <View>
          <View style={styles.summaryRow}>
            <Skeleton height={92} radius={14} style={{ flex: 1 }} />
            <Skeleton height={92} radius={14} style={{ flex: 1 }} />
            <Skeleton height={92} radius={14} style={{ flex: 1 }} />
          </View>
          <Skeleton height={260} radius={16} />
        </View>
      ) : null}

      {error ? (
        <PremiumCard style={styles.errorStateCard}>
          <Text style={[styles.errorTitle, { textAlign }]}>{i18n.t("calendarLoadError")}</Text>
          <Text style={[styles.errorText, { textAlign }]}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadMonth(cursorYear, cursorMonth, "full")}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.navBtnPressed]}
          >
            <Text style={styles.retryText}>{i18n.t("calendarRetry")}</Text>
          </Pressable>
        </PremiumCard>
      ) : null}

      {unavailable ? (
        <PremiumCard style={styles.stateCard}>
          <Text style={[styles.stateText, { textAlign }]}>{i18n.t("calendarUnavailable")}</Text>
        </PremiumCard>
      ) : null}

      {showGrid ? (
        <>
          <View style={styles.summaryRow}>
            <StatTile
              tone="success"
              isAr={isAr}
              icon={<Ionicons name="checkmark-circle" size={20} color={colors.successDark} />}
              value={monthSummary.present}
              label={i18n.t("stmtPresent")}
            />
            <StatTile
              tone="warning"
              isAr={isAr}
              icon={<Ionicons name="alert-circle" size={20} color={colors.warning} />}
              value={monthSummary.incomplete}
              label={i18n.t("stmtIncomplete")}
            />
            <StatTile
              tone="danger"
              isAr={isAr}
              icon={<Ionicons name="close-circle" size={20} color={colors.danger} />}
              value={monthSummary.absent}
              label={i18n.t("stmtAbsent")}
            />
          </View>

          <View style={[styles.weekdayRow, { flexDirection: rowDir }]}>
            {weekdays.map((w) => (
              <Text key={w} style={styles.weekdayText}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.gridWrap}>
            {Array.from({ length: Math.ceil(grid.length / 7) }, (_, rowIndex) => (
              <View key={`wk-${rowIndex}`} style={[styles.weekRow, { flexDirection: rowDir }]}> 
                {grid.slice(rowIndex * 7, rowIndex * 7 + 7).map((cell) => {
                  const vis = statusVisual(cell.status);
                  const isToday = cell.date === todayKey;
                  const isSelected = selectedDate === cell.date;
                  const muted = !cell.isCurrentMonth;
                  const events = cell.isCurrentMonth ? overlaysByDate.get(cell.date) ?? [] : [];
                  const hasApprovedLeave = events.some(
                    (event) => event.type === "leave" && isApprovedLeaveStatus(event.status)
                  );
                  const visibleEvents = events.slice(0, OVERLAY_DOT_MAX);
                  const remainingEvents = Math.max(0, events.length - OVERLAY_DOT_MAX);

                  return (
                    <Pressable
                      key={cell.date}
                      onPress={() => setSelectedDate(cell.date)}
                      style={({ pressed }) => [styles.dayWrap, pressed && styles.dayPressed]}
                    >
                      <View
                        style={[
                          styles.dayCircle,
                          { borderColor: vis.ring, backgroundColor: vis.fill },
                          hasApprovedLeave && cell.isCurrentMonth && styles.dayCircleApprovedLeave,
                          muted && styles.dayCircleMuted,
                          isToday && cell.isCurrentMonth && styles.dayCircleToday,
                          isSelected && styles.dayCircleSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNum,
                            { color: vis.text },
                            hasApprovedLeave && cell.isCurrentMonth && styles.dayNumApprovedLeave,
                            muted && styles.dayNumMuted,
                          ]}
                        >
                          {cell.dayNumber}
                        </Text>
                      </View>

                      {/* Single, consistent indicator row BELOW the circle. A dot = an event
                          on that day (task / announcement / leave / holiday); attendance status
                          is shown by the circle color, today by its ring. */}
                      {cell.isCurrentMonth && visibleEvents.length > 0 ? (
                        <View style={[styles.overlayDotsRow, isAr && styles.overlayDotsRowAr]}>
                          {visibleEvents.map((event) => (
                            <View key={event.id} style={[styles.overlayDot, { backgroundColor: eventTypeColor(event.type) }]} />
                          ))}
                          {remainingEvents > 0 ? (
                            <Text style={styles.moreEventsText}>+{remainingEvents}</Text>
                          ) : null}
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {selectedDay ? (
            <PremiumCard style={styles.detailCard}>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate("DayDetail", {
                    date: selectedDay.date,
                    statusKey: selectedDay.status,
                    workedMinutes: selectedDay.workedMinutes,
                    expectedMinutes: selectedDay.expectedMinutes,
                    isWorkDay: selectedDay.scheduleDay?.is_work_day === true,
                    shiftName: selectedDay.scheduleDay?.shift_name ?? selectedDay.scheduleDay?.shift_type ?? null,
                    startTime: selectedDay.scheduleDay?.start_time ?? null,
                    endTime: selectedDay.scheduleDay?.end_time ?? null,
                  })
                }
                style={({ pressed }) => [styles.detailTitleRow, { flexDirection: rowDir }, pressed && styles.detailTitlePressed]}
              >
                <Text style={[styles.detailTitle, { textAlign, flex: 1 }]}>{i18n.t("calendarSelectedDateDetails")}</Text>
                <Ionicons name={isAr ? "chevron-back" : "chevron-forward"} size={18} color={colors.primaryDark} />
              </Pressable>

              <View style={styles.detailRows}>
                <DetailRow label={i18n.t("calendarDateLabel")} value={formatDateLabel(selectedDay.date, locale)} textAlign={textAlign} />
                <DetailRow
                  label={i18n.t("calendarStatusLabel")}
                  value={statusLabel(selectedDay.status)}
                  textAlign={textAlign}
                  valueColor={statusVisual(selectedDay.status).text}
                />

                {selectedDay.scheduleDay?.shift_name || selectedDay.scheduleDay?.shift_type ? (
                  <DetailRow
                    label={i18n.t("calendarShiftLabel")}
                    value={String(selectedDay.scheduleDay?.shift_name ?? selectedDay.scheduleDay?.shift_type ?? "")}
                    textAlign={textAlign}
                  />
                ) : null}

                {selectedDay.expectedMinutes != null && selectedDay.expectedMinutes > 0 ? (
                  <DetailRow
                    label={i18n.t("calendarExpectedHours")}
                    value={formatMinutes(selectedDay.expectedMinutes, locale)}
                    textAlign={textAlign}
                  />
                ) : null}

                {selectedDay.scheduleDay?.is_work_day === true && selectedDay.status !== "scheduled" ? (
                  <DetailRow
                    label={i18n.t("calendarActualHours")}
                    value={formatMinutes(selectedDay.workedMinutes, locale)}
                    textAlign={textAlign}
                  />
                ) : null}
              </View>

              <View style={styles.eventsSection}>
                {selectedAnnouncements.length === 0 &&
                selectedTasks.length === 0 &&
                selectedRequests.length === 0 &&
                selectedHolidays.length === 0 ? (
                  <View style={styles.eventsEmpty}>
                    <Ionicons name="sparkles-outline" size={20} color={colors.textMuted} />
                    <Text style={[styles.eventsEmptyText, { textAlign }]}>{i18n.t("calendarNoEventsDay")}</Text>
                  </View>
                ) : null}

                {selectedAnnouncements.length > 0 ? (
                  <View style={styles.eventGroup}>
                    <Text style={[styles.eventsSectionTitle, { textAlign }]}>
                      {i18n.t("calendarAnnouncementsSection")}
                    </Text>
                    <View style={styles.eventsList}>
                      {selectedAnnouncements.map((event) => (
                        <EventRow
                          key={event.id}
                          event={event}
                          textAlign={textAlign}
                          isAr={isAr}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}

                {selectedTasks.length > 0 ? (
                  <View style={styles.eventGroup}>
                    <Text style={[styles.eventsSectionTitle, { textAlign }]}>
                      {i18n.t("calendarTasksSection")}
                    </Text>
                    <View style={styles.eventsList}>
                      {selectedTasks.map((event) => (
                        <EventRow
                          key={event.id}
                          event={event}
                          textAlign={textAlign}
                          isAr={isAr}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}

                {selectedRequests.length > 0 ? (
                  <View style={styles.eventGroup}>
                    <Text style={[styles.eventsSectionTitle, { textAlign }]}>
                      {i18n.t("calendarRequestsSection")}
                    </Text>
                    <View style={styles.eventsList}>
                      {selectedRequests.map((event) => (
                        <EventRow
                          key={event.id}
                          event={event}
                          textAlign={textAlign}
                          isAr={isAr}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}

                {selectedHolidays.length > 0 ? (
                  <View style={styles.eventGroup}>
                    <Text style={[styles.eventsSectionTitle, { textAlign }]}>
                      {i18n.t("calendarHolidaysSection")}
                    </Text>
                    <View style={styles.eventsList}>
                      {selectedHolidays.map((event) => (
                        <EventRow
                          key={event.id}
                          event={event}
                          textAlign={textAlign}
                          isAr={isAr}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            </PremiumCard>
          ) : null}

          <View style={[styles.legendRow, { flexDirection: rowDir }]}> 
            {STATUS_ORDER.map((status) => (
              <LegendChip key={status} status={status} isAr={isAr} />
            ))}
          </View>
        </>
      ) : null}
    </ScreenShell>
  );
}

function DetailRow({
  label,
  value,
  textAlign,
  valueColor,
}: {
  label: string;
  value: string;
  textAlign: "left" | "right";
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { textAlign }]}>{label}</Text>
      <Text style={[styles.detailValue, { textAlign }, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function EventRow({
  event,
  textAlign,
  isAr,
}: {
  event: CalendarOverlayEvent;
  textAlign: "left" | "right";
  isAr: boolean;
}) {
  const display = buildEventDisplay(event);
  const isTask = event.type === "task";
  const taskAccent = isTask
    ? { borderStartWidth: 3 as const, borderStartColor: eventTypeColor("task") }
    : null;
  return (
    <View style={[styles.eventItem, isAr && styles.eventItemAr, taskAccent]}>
      <View style={[styles.eventDot, { backgroundColor: eventTypeColor(event.type) }]} />
      <View style={styles.eventTextCol}>
        <Text style={[styles.eventTitle, { textAlign }]}>{display.title}</Text>
        {display.subtitle ? (
          <Text style={[styles.eventSubtitle, { textAlign }]} numberOfLines={2}>
            {display.subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsCard: {
    marginBottom: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  controlsRow: { alignItems: "center", justifyContent: "space-between", gap: 6 },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
  },
  navBtnPressed: { opacity: 0.75 },
  monthBlock: { flex: 1, paddingHorizontal: 8 },
  monthTitle: { fontSize: 16, fontWeight: "800", color: colors.ink, letterSpacing: -0.2 },
  monthCaption: { fontSize: 10, fontWeight: "700", color: colors.textSecondary, marginTop: 2 },
  scheduleCard: { marginBottom: 8, paddingVertical: 7, paddingHorizontal: 12 },
  scheduleLabel: { fontSize: 10, fontWeight: "800", color: colors.ink, marginBottom: 3 },
  scheduleValue: { fontSize: 14, fontWeight: "700", color: colors.ink },
  stateCard: {
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stateText: { marginTop: 8, fontSize: 14, fontWeight: "700", color: colors.ink },
  errorStateCard: {
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "stretch",
    backgroundColor: colors.dangerLight,
    borderColor: "#F2C5C5",
  },
  errorTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  errorText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginTop: 4 },
  retryBtn: {
    marginTop: 10,
    alignSelf: "center",
    backgroundColor: colors.ink,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  retryText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  weekdayRow: { marginBottom: 4, paddingHorizontal: 2, justifyContent: "space-between" },
  weekdayText: { width: CELL_W, textAlign: "center", fontSize: 10, fontWeight: "800", color: colors.ink },
  gridWrap: { marginBottom: 8 },
  weekRow: { justifyContent: "space-between", marginBottom: 4, paddingHorizontal: 2 },
  dayWrap: { width: CELL_W, alignItems: "center", justifyContent: "center" },
  dayPressed: { opacity: 0.7 },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayCircleMuted: { opacity: 0.35 },
  dayCircleApprovedLeave: {
    borderColor: "#151515",
    backgroundColor: "#F2F2F2",
  },
  dayCircleSelected: {
    borderWidth: 2,
    borderColor: colors.ink,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 5,
  },
  dayCircleToday: {
    borderColor: colors.successDark,
    backgroundColor: colors.successLight,
  },
  dayNum: { fontSize: 11, fontWeight: "800", fontVariant: ["tabular-nums"] },
  dayNumApprovedLeave: { color: "#1A1A1A" },
  dayNumMuted: { color: colors.textSecondary },
  workDot: { position: "absolute", bottom: 4, width: 4, height: 4, borderRadius: 2 },
  todayDot: { position: "absolute", top: 4, width: 4, height: 4, borderRadius: 2, opacity: 0.85, backgroundColor: colors.successDark },
  overlayDotsRow: { marginTop: 1, minHeight: 7, flexDirection: "row", alignItems: "center", gap: 1 },
  overlayDotsRowAr: { flexDirection: "row-reverse" },
  overlayDot: { width: 4, height: 4, borderRadius: 2 },
  moreEventsText: { fontSize: 7, fontWeight: "800", color: colors.textSecondary, lineHeight: 9 },
  detailCard: {
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    ...shadowCard,
  },
  detailTitle: { fontSize: 13, fontWeight: "800", color: colors.ink, marginBottom: 8 },
  detailTitleRow: { alignItems: "center", gap: 8, marginBottom: 2 },
  detailTitlePressed: { opacity: 0.7 },
  detailRows: { gap: 4 },
  detailRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceSubtle,
  },
  detailLabel: { fontSize: 11, fontWeight: "800", color: colors.textSecondary, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: "800", color: colors.ink },
  eventsSection: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  eventsEmpty: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  eventsEmptyText: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.textMuted, lineHeight: 19 },
  eventGroup: { marginBottom: 8 },
  eventsSectionTitle: { fontSize: 12, fontWeight: "800", color: colors.ink, marginBottom: 8 },
  noEventsText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  eventsList: { gap: 8 },
  eventItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  eventItemAr: { flexDirection: "row-reverse" },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  eventTextCol: { flex: 1, minWidth: 0 },
  eventTitle: { fontSize: 12, fontWeight: "800", color: colors.ink, letterSpacing: -0.1, lineHeight: 17 },
  eventSubtitle: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginTop: 3, lineHeight: 15 },
  legendRow: { flexWrap: "wrap", gap: 7, marginBottom: 2 },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
    gap: 6,
  },
  legendChipAr: { flexDirection: "row-reverse" },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: "800" },
});
