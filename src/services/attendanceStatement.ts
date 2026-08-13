import {
  EmployeeCheckinLogRow,
  MobileWorkCalendarDayStatus,
  WorkScheduleMonthDay,
} from "../types/api";
import {
  attendanceService,
  dateKeyInTimeZone,
  expectedMinutesFromShiftTimes,
  RIYADH_TZ,
  workedMinutesFromCheckinsSameDay,
} from "./attendanceService";

/**
 * Monthly attendance statement — one detailed record per scheduled day plus month
 * totals. Everything is derived on the client from the same primitives the calendar
 * uses (work-schedule shift times + Employee Checkin rows), so there is no separate
 * BFF endpoint: worked = sum of completed IN→OUT pairs, expected = shift length,
 * overtime = max(0, worked − expected), missing = max(0, expected − worked).
 */
export interface StatementDay {
  date: string;
  dayNumber: number;
  status: MobileWorkCalendarDayStatus;
  workedMinutes: number;
  expectedMinutes: number | null;
  /** Minutes worked beyond the scheduled shift (0 when none / unknown). */
  overtimeMinutes: number;
  /** Scheduled minutes not yet worked on a past work day (0 when none / future). */
  missingMinutes: number;
  isWorkDay: boolean;
  isFuture: boolean;
}

export interface MonthlyStatement {
  year: number;
  month: number;
  /** Fully-worked days (status = complete). */
  presentCount: number;
  /** Work days with some but not all hours (status = partial). */
  incompleteCount: number;
  /** Work days with no recorded attendance in the past (status = absent). */
  absentCount: number;
  offCount: number;
  totalWorkedMinutes: number;
  totalOvertimeMinutes: number;
  totalMissingMinutes: number;
  /** Current-month days only, in ascending date order. */
  days: StatementDay[];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
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
  if (dateKey > todayKey) return isWorkDay === true ? "scheduled" : "off";
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

/** Today's date key in Riyadh (YYYY-MM-DD). */
function riyadhTodayKey(): string {
  const now = new Date();
  return dateKeyInTimeZone(now.toISOString(), RIYADH_TZ) ?? `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/**
 * Loads schedule + check-ins for the month and returns per-day records and totals.
 * Session-scoped (uses the caller's cookie), so it never crosses company/employee.
 */
export async function loadMonthlyStatement(year: number, month1: number): Promise<MonthlyStatement> {
  const [schedule, checkins] = await Promise.all([
    attendanceService.getWorkScheduleMonth(year, month1),
    attendanceService.getEmployeeCheckinsForMonth(year, month1),
  ]);

  const scheduleByDate = new Map<string, WorkScheduleMonthDay | null>();
  for (const item of schedule?.items ?? []) {
    if (item?.date) scheduleByDate.set(item.date, item);
  }
  const workedByDate = buildWorkedByDate(checkins, RIYADH_TZ);
  const todayKey = riyadhTodayKey();

  const lastDay = new Date(year, month1, 0).getDate();
  const days: StatementDay[] = [];
  let presentCount = 0;
  let incompleteCount = 0;
  let absentCount = 0;
  let offCount = 0;
  let totalWorkedMinutes = 0;
  let totalOvertimeMinutes = 0;
  let totalMissingMinutes = 0;

  for (let d = 1; d <= lastDay; d++) {
    const date = `${year}-${pad2(month1)}-${pad2(d)}`;
    const scheduleDay = scheduleByDate.get(date) ?? null;
    const workedMinutes = Math.max(0, workedByDate.get(date) ?? 0);
    const expectedMinutes = resolveExpectedMinutesForDay(scheduleDay);
    const status = computeDayStatus(date, todayKey, scheduleDay, workedMinutes, expectedMinutes);
    const isWorkDay = scheduleDay?.is_work_day === true;
    const isFuture = date > todayKey;

    const overtimeMinutes =
      expectedMinutes != null && expectedMinutes > 0 && workedMinutes > expectedMinutes
        ? workedMinutes - expectedMinutes
        : 0;
    const missingMinutes =
      !isFuture && expectedMinutes != null && expectedMinutes > 0 && workedMinutes < expectedMinutes
        ? expectedMinutes - workedMinutes
        : 0;

    if (status === "complete") presentCount += 1;
    else if (status === "partial") incompleteCount += 1;
    else if (status === "absent") absentCount += 1;
    else if (status === "off") offCount += 1;

    totalWorkedMinutes += workedMinutes;
    totalOvertimeMinutes += overtimeMinutes;
    totalMissingMinutes += missingMinutes;

    days.push({
      date,
      dayNumber: d,
      status,
      workedMinutes,
      expectedMinutes,
      overtimeMinutes,
      missingMinutes,
      isWorkDay,
      isFuture,
    });
  }

  return {
    year,
    month: month1,
    presentCount,
    incompleteCount,
    absentCount,
    offCount,
    totalWorkedMinutes,
    totalOvertimeMinutes,
    totalMissingMinutes,
    days,
  };
}
