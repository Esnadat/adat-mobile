import type { AxiosResponse } from "axios";
import { http } from "./http";

export interface TeamMember {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  department: string;
}

export interface TeamMemberPendingRequest {
  id: string;
  type: string;
  leave_type?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

export interface TeamMemberDetail {
  profile: {
    employee: string;
    employee_name: string;
    designation: string;
    department: string;
    date_of_joining: string;
    status: string;
    mobile: string;
    email: string;
  };
  pendingRequests: TeamMemberPendingRequest[];
}

/** One member's attendance for a day (best-effort shape from team-attendance-report). */
export interface TeamAttendanceEntry {
  employee: string;
  status?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
}

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}
function asArray(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  return [];
}

export const teamService = {
  /** Direct reports of the session manager. Non-managers get 403 (caller treats as "not a manager"). */
  async getTeamMembers(): Promise<TeamMember[]> {
    const res: AxiosResponse<unknown> = await http.get("/api/manager/team-members");
    const body = res.data as { data?: unknown } | undefined;
    const rows = asArray(body?.data);
    return rows
      .map((r) => {
        const id = str(r.id) || str(r.employeeId);
        if (!id) return null;
        return {
          id,
          employeeId: str(r.employeeId) || id,
          name: str(r.nameEn) || str(r.employee_name) || id,
          position: str(r.position) || str(r.designation),
          department: str(r.department),
        } as TeamMember;
      })
      .filter((x): x is TeamMember => x !== null);
  },

  /**
   * One direct report's detail. The server enforces that the target is the caller's
   * direct report (403 otherwise) — this is not a client-side guard.
   */
  async getTeamMember(employee: string): Promise<TeamMemberDetail | null> {
    const res: AxiosResponse<unknown> = await http.get(`/api/manager/team-member/${encodeURIComponent(employee)}`);
    const body = res.data as { data?: TeamMemberDetail } | undefined;
    return body?.data ?? null;
  },

  /** Today's attendance rows for the team, keyed loosely by employee id/number. */
  async getTeamAttendanceToday(): Promise<Map<string, TeamAttendanceEntry>> {
    const map = new Map<string, TeamAttendanceEntry>();
    try {
      const res: AxiosResponse<unknown> = await http.get("/api/manager/team-attendance-report");
      const body = res.data as { data?: unknown } | undefined;
      const container = (body?.data ?? {}) as Record<string, unknown>;
      const rows = asArray(container.rows ?? container.items ?? container.employees ?? body?.data);
      for (const r of rows) {
        const emp = str(r.employee) || str(r.employeeId) || str(r.employee_number) || str(r.name);
        if (!emp) continue;
        map.set(emp, {
          employee: emp,
          status: str(r.status) || str(r.attendance_status) || null,
          checkIn: str(r.checkIn) || str(r.check_in) || str(r.first_in) || null,
          checkOut: str(r.checkOut) || str(r.check_out) || str(r.last_out) || null,
        });
      }
    } catch {
      /* attendance is best-effort; the member list still renders */
    }
    return map;
  },
};
