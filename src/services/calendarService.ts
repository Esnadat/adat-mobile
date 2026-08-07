import {
  CalendarOverlayEvent,
  EmployeeRequest,
  EstablishmentAnnouncement,
  OfficialHoliday,
} from "../types/api";
import { announcementService } from "./announcementService";
import { attendanceService, riyadhMonthRangeKeys } from "./attendanceService";
import { getApiErrorMessage } from "./http";
import { requestService } from "./requestService";
import { taskService } from "./taskService";

function clampDateToMonthRange(date: string, monthStart: string, monthEnd: string): string | null {
  if (!date) return null;
  if (date < monthStart) return monthStart;
  if (date > monthEnd) return monthEnd;
  return date;
}

function listDateKeysInRangeInclusive(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  if (!startDate || !endDate || endDate < startDate) return out;
  const cur = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (cur.getTime() <= end.getTime()) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function normalizeDateKey(value: string | null | undefined): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  return s.includes("T") ? s.slice(0, 10) : s.slice(0, 10);
}

function mapTaskEvents(tasks: Awaited<ReturnType<typeof taskService.listMyTasks>>): CalendarOverlayEvent[] {
  return tasks
    .filter((task) => {
      const status = String(task.status ?? "")
        .trim()
        .toLowerCase();
      return status === "open" || status === "in_progress";
    })
    .flatMap((task) => {
      const date = normalizeDateKey(task.due_date != null ? String(task.due_date) : "");
      if (!date) return [];
      return [
        {
          id: `task:${task.id}:${date}`,
          type: "task" as const,
          date,
          title: task.title || "Task",
          subtitle: null,
          status: task.status != null ? String(task.status) : null,
          priority: task.priority != null ? String(task.priority) : null,
        },
      ];
    });
}

function mapAnnouncementEvents(
  rows: EstablishmentAnnouncement[],
  year: number,
  month: number
): CalendarOverlayEvent[] {
  const { startKey: monthStart, endKey: monthEnd } = riyadhMonthRangeKeys(year, month);
  const out: CalendarOverlayEvent[] = [];
  for (const row of rows) {
    const id = String(row.id ?? "").trim();
    if (!id) continue;
    const title = String(row.title_ar ?? row.title_en ?? "").trim();
    if (!title) continue;

    const start = normalizeDateKey(row.starts_on != null ? String(row.starts_on) : null);
    const end = normalizeDateKey(row.ends_on != null ? String(row.ends_on) : null);
    const first = clampDateToMonthRange(start || end || "", monthStart, monthEnd);
    if (!first) continue;
    const last = clampDateToMonthRange(end || start || "", monthStart, monthEnd);
    if (!last || last < first) continue;

    const dates = listDateKeysInRangeInclusive(first, last);
    for (const date of dates) {
      out.push({
        id: `announcement:${id}:${date}`,
        type: "announcement",
        date,
        endDate: date,
        title,
        subtitle: null,
        priority: row.priority != null ? String(row.priority) : null,
      });
    }
  }
  return out;
}

function mapHolidayEvents(rows: OfficialHoliday[]): CalendarOverlayEvent[] {
  const out: CalendarOverlayEvent[] = [];
  rows.forEach((h, idx) => {
    const date = normalizeDateKey(h.date);
    if (!date) return;
    const title = String(h.description ?? h.name ?? "").trim() || "Holiday";
    out.push({
      id: `holiday:${date}:${idx}`,
      type: "holiday",
      date,
      title,
      subtitle: h.weekly_off ? "weekly_off" : null,
    });
  });
  return out;
}

function mapRequestEvents(rows: EmployeeRequest[], year: number, month: number): CalendarOverlayEvent[] {
  const { startKey: monthStart, endKey: monthEnd } = riyadhMonthRangeKeys(year, month);
  const out: CalendarOverlayEvent[] = [];
  for (const req of rows) {
    const status = String(req.status ?? "").trim().toLowerCase();
    if (!(status === "approved" || status === "pending")) continue;

    if (req.type === "leave") {
      const startRaw = normalizeDateKey(req.fromDate ?? req.permissionDate ?? null);
      const endRaw = normalizeDateKey(req.toDate ?? req.fromDate ?? req.permissionDate ?? null);
      const first = clampDateToMonthRange(startRaw || "", monthStart, monthEnd);
      const last = clampDateToMonthRange(endRaw || "", monthStart, monthEnd);
      if (!first || !last || last < first) continue;
      const dates = listDateKeysInRangeInclusive(first, last);
      for (const date of dates) {
        out.push({
          id: `leave:${req.id}:${date}`,
          type: "leave",
          date,
          endDate: date,
          title: req.leaveType != null ? String(req.leaveType) : "",
          subtitle: req.leaveType != null ? String(req.leaveType) : null,
          status: req.status,
        });
      }
      continue;
    }

    if (req.type === "permission") {
      const date = normalizeDateKey(req.permissionDate ?? null);
      if (!date || date < monthStart || date > monthEnd) continue;
      const timePart =
        req.startTime || req.endTime
          ? `${String(req.startTime ?? "").trim()} ${String(req.endTime ? `- ${req.endTime}` : "").trim()}`.trim()
          : null;
      out.push({
        id: `permission:${req.id}:${date}`,
        type: "permission",
        date,
        title: "",
        subtitle: timePart,
        status: req.status,
      });
    }
  }
  return out;
}

export const calendarService = {
  async getOfficialHolidaysForMonth(year: number, month: number): Promise<OfficialHoliday[]> {
    return attendanceService.getOfficialHolidaysForMonth(year, month);
  },

  async getCalendarOverlaysForMonth(year: number, month: number): Promise<CalendarOverlayEvent[]> {
    const safe = async <T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await fn();
      } catch (error) {
        if (__DEV__) {
          console.warn("[calendar-overlays] failed:", `${label}: ${getApiErrorMessage(error)}`);
        }
        return fallback;
      }
    };

    const [tasks, announcements, requests, holidays] = await Promise.all([
      safe("tasks", () => taskService.listMyTasks(), [] as Awaited<ReturnType<typeof taskService.listMyTasks>>),
      safe(
        "announcements",
        () => announcementService.getCurrentAnnouncements(),
        [] as Awaited<ReturnType<typeof announcementService.getCurrentAnnouncements>>
      ),
      safe("requests", () => requestService.getMyRequests(), [] as Awaited<ReturnType<typeof requestService.getMyRequests>>),
      safe("holidays", () => this.getOfficialHolidaysForMonth(year, month), [] as OfficialHoliday[]),
    ]);

    return [
      ...mapTaskEvents(tasks),
      ...mapAnnouncementEvents(announcements, year, month),
      ...mapHolidayEvents(holidays),
      ...mapRequestEvents(requests, year, month),
    ];
  },
};
