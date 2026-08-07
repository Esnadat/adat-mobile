import {
  CheckInOutPayload,
  EmployeeCheckinLogRow,
  OfficialHoliday,
  WorkScheduleMonthPayload,
  WorkScheduleTodayPayload,
} from "../types/api";
import { AxiosResponse } from "axios";
import { http } from "./http";

const RIYADH_TZ = "Asia/Riyadh";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Month boundaries as YYYY-MM-DD in Riyadh (matches portal attendance calendar). */
export function riyadhMonthRangeKeys(year: number, month1: number): { startKey: string; endKey: string } {
  const lastDay = new Date(Date.UTC(year, month1, 0)).getUTCDate();
  return {
    startKey: `${year}-${pad2(month1)}-01`,
    endKey: `${year}-${pad2(month1)}-${pad2(lastDay)}`,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function unwrapAttendanceData<T>(raw: unknown): T | null {
  if (!isRecord(raw)) return null;
  const nested = raw.data;
  if (isRecord(nested)) {
    return nested as T;
  }
  if (
    typeof (raw as { work_schedule_name?: unknown }).work_schedule_name === "string" ||
    typeof raw.year === "number" ||
    Array.isArray((raw as { items?: unknown }).items)
  ) {
    return raw as T;
  }
  return null;
}

function normalizeLogType(raw: unknown): "IN" | "OUT" | null {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (s === "IN") return "IN";
  if (s === "OUT") return "OUT";
  return null;
}

/** Sum completed IN→OUT pairs only; trailing IN without OUT adds no minutes. */
export function workedMinutesFromCheckinsSameDay(sorted: EmployeeCheckinLogRow[]): number {
  let pendingInMs: number | null = null;
  let totalMin = 0;
  for (const row of sorted) {
    const t = normalizeLogType(row.log_type);
    if (!t) continue;
    const ms = Date.parse(String(row.time ?? ""));
    if (!Number.isFinite(ms)) continue;
    if (t === "IN") {
      pendingInMs = ms;
    } else if (t === "OUT" && pendingInMs != null) {
      const diff = Math.max(0, Math.round((ms - pendingInMs) / 60000));
      totalMin += diff;
      pendingInMs = null;
    }
  }
  return Math.max(0, totalMin);
}

/** Same rule as portal-api `computeExpectedMinutesFromShiftTimes`. */
export function expectedMinutesFromShiftTimes(startTimeRaw: string | null | undefined, endTimeRaw: string | null | undefined): number | null {
  const start = String(startTimeRaw ?? "").trim();
  const end = String(endTimeRaw ?? "").trim();
  if (!start || !end) return null;
  const parse = (s: string): number | null => {
    const p = s.split(":");
    if (p.length < 2) return null;
    const h = Number.parseInt(p[0] ?? "0", 10);
    const m = Number.parseInt(p[1] ?? "0", 10);
    const sec = Number.parseInt(p[2] ?? "0", 10);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 3600 + m * 60 + (Number.isFinite(sec) ? sec : 0);
  };
  const startTotal = parse(start);
  const endTotal = parse(end);
  if (startTotal == null || endTotal == null) return null;
  let diffSeconds = endTotal - startTotal;
  if (diffSeconds <= 0) diffSeconds += 24 * 3600;
  return Math.round(diffSeconds / 60);
}

export function dateKeyInTimeZone(isoOrErpTime: string, timeZone: string): string | null {
  const ms = Date.parse(String(isoOrErpTime ?? ""));
  if (!Number.isFinite(ms)) return null;
  try {
    const d = new Date(ms);
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    if (!y || !m || !day) return null;
    return `${y}-${m}-${day}`;
  } catch {
    return null;
  }
}

export const attendanceService = {
  // Mobile app reuses existing portal-api attendance contracts used by web frontend.
  checkIn(payload: CheckInOutPayload) {
    return http.post("/api/attendance/checkin", {
      latitude: payload.latitude,
      longitude: payload.longitude,
      device_id: "portal-mobile",
      location_name: "Mobile GPS",
    });
  },
  checkOut(payload: CheckInOutPayload) {
    return http.post("/api/attendance/checkout", {
      latitude: payload.latitude,
      longitude: payload.longitude,
      device_id: "portal-mobile",
      location_name: "Mobile GPS",
    });
  },

  async getTodayWorkSchedule(): Promise<WorkScheduleTodayPayload | null> {
    try {
      const response: AxiosResponse<unknown> = await http.get("/api/attendance/work-schedule/today");
      const body = response.data;
      const data = unwrapAttendanceData<WorkScheduleTodayPayload>(body);
      return data;
    } catch {
      return null;
    }
  },

  async getWorkScheduleMonth(year: number, month: number): Promise<WorkScheduleMonthPayload | null> {
    const response: AxiosResponse<unknown> = await http.get("/api/attendance/work-schedule/month", {
      params: { year, month },
    });
    const body = response.data;
    if (isRecord(body) && body.ok === false) {
      throw new Error(String((body as { message?: unknown }).message ?? "Schedule request failed"));
    }
    return unwrapAttendanceData<WorkScheduleMonthPayload>(body);
  },

  /**
   * Session-scoped Employee Checkin rows for a calendar month (Riyadh date range on `time`).
   */
  async getEmployeeCheckinsForMonth(year: number, month: number): Promise<EmployeeCheckinLogRow[]> {
    const { startKey, endKey } = riyadhMonthRangeKeys(year, month);
    const filters = [
      ["Employee Checkin", "time", ">=", `${startKey} 00:00:00`],
      ["Employee Checkin", "time", "<=", `${endKey} 23:59:59`],
    ];
    try {
      const response: AxiosResponse<unknown> = await http.get(
        `/api/resource/${encodeURIComponent("Employee Checkin")}`,
        {
          params: {
            filters: JSON.stringify(filters),
            order_by: "time asc",
            limit_page_length: 2000,
          },
        }
      );
      const body = response.data as { data?: unknown } | unknown;
      const rowsUnknown = isRecord(body as object) ? (body as { data?: unknown }).data : null;
      if (!Array.isArray(rowsUnknown)) return [];
      const out: EmployeeCheckinLogRow[] = [];
      for (const r of rowsUnknown) {
        if (!isRecord(r)) continue;
        const name = String(r.name ?? "").trim();
        if (!name) continue;
        const time = String(r.time ?? "").trim();
        if (!time) continue;
        out.push({
          name,
          employee: r.employee != null ? String(r.employee) : null,
          employee_name: r.employee_name != null ? String(r.employee_name) : null,
          time,
          log_type: r.log_type != null ? String(r.log_type) : null,
          shift: r.shift != null ? String(r.shift) : null,
          creation: r.creation != null ? String(r.creation) : null,
        });
      }
      return out;
    } catch {
      return [];
    }
  },

  async getOfficialHolidaysForMonth(year: number, month: number): Promise<OfficialHoliday[]> {
    try {
      const response: AxiosResponse<unknown> = await http.get("/api/attendance/holidays/month", {
        params: { year, month },
      });
      const body = response.data as { ok?: boolean; message?: unknown; data?: { items?: unknown } } | unknown;
      if (isRecord(body) && body.ok === false) {
        if (__DEV__) {
          console.warn(
            "[calendar-overlays] failed:",
            `holidays: ${String((body as { message?: unknown }).message ?? "Holidays request failed")}`
          );
        }
        return [];
      }
      const items = isRecord(body) && isRecord(body.data) ? body.data.items : null;
      if (!Array.isArray(items)) return [];
      const out: OfficialHoliday[] = [];
      for (const row of items) {
        if (!isRecord(row)) continue;
        const date = String(row.date ?? "").trim();
        if (!date) continue;
        out.push({
          date,
          name: row.name != null ? String(row.name) : null,
          description: row.description != null ? String(row.description) : null,
          weekly_off: row.weekly_off === true || row.weekly_off === 1 || row.weekly_off === "1",
        });
      }
      return out;
    } catch {
      if (__DEV__) {
        console.warn("[calendar-overlays] failed:", "holidays: Failed to fetch holidays");
      }
      return [];
    }
  },
};

export { RIYADH_TZ };
