import { http } from "./http";
import { IDEMPOTENCY_HEADER } from "../utils/idempotency";

/** A leave the employee may request to cancel (approved + not yet started). */
export interface EligibleLeave {
  leaveApplication: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalLeaveDays: number | null;
}

export type LeaveCancellationStatus =
  | "pending_manager"
  | "pending_hr"
  | "approved"
  | "rejected"
  | "cancel_failed";

export interface LeaveCancellationRequest {
  id: string;
  employee: string;
  employeeName?: string;
  leaveApplication: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalLeaveDays: number | null;
  reason: string;
  status: LeaveCancellationStatus;
  managerAt?: string | null;
  hrAt?: string | null;
  rejectedAt?: string | null;
  rejectReason?: string | null;
  createdAt: string;
  updatedAt?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}
function str(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeRequest(raw: Record<string, unknown>): LeaveCancellationRequest {
  return {
    id: str(raw.id),
    employee: str(raw.employee),
    employeeName: str(raw.employee_name) || undefined,
    leaveApplication: str(raw.leave_application),
    leaveType: str(raw.leave_type),
    fromDate: str(raw.from_date),
    toDate: str(raw.to_date),
    totalLeaveDays: raw.total_leave_days != null ? Number(raw.total_leave_days) : null,
    reason: str(raw.reason),
    status: (str(raw.status) || "pending_manager") as LeaveCancellationStatus,
    managerAt: raw.manager_at != null ? str(raw.manager_at) : null,
    hrAt: raw.hr_at != null ? str(raw.hr_at) : null,
    rejectedAt: raw.rejected_at != null ? str(raw.rejected_at) : null,
    rejectReason: raw.reject_reason != null ? str(raw.reject_reason) : null,
    createdAt: str(raw.created_at),
    updatedAt: raw.updated_at != null ? str(raw.updated_at) : undefined,
  };
}

export const leaveCancellationService = {
  async eligibleLeaves(): Promise<EligibleLeave[]> {
    const res = await http.get("/api/leave-cancellations/eligible-leaves");
    const d = isRecord(res.data) ? (res.data as { data?: unknown }).data : null;
    const items = Array.isArray(d) ? d : [];
    return items.filter(isRecord).map((r) => ({
      leaveApplication: str(r.leave_application),
      leaveType: str(r.leave_type),
      fromDate: str(r.from_date),
      toDate: str(r.to_date),
      totalLeaveDays: r.total_leave_days != null ? Number(r.total_leave_days) : null,
    }));
  },

  async create(
    leaveApplication: string,
    reason: string,
    opts?: { idempotencyKey?: string }
  ): Promise<LeaveCancellationRequest> {
    const cfg = opts?.idempotencyKey ? { headers: { [IDEMPOTENCY_HEADER]: opts.idempotencyKey } } : undefined;
    const res = await http.post("/api/leave-cancellations", { leaveApplication, reason }, cfg);
    const d = isRecord(res.data) ? (res.data as { data?: unknown }).data : null;
    return normalizeRequest(isRecord(d) ? d : {});
  },

  async myList(): Promise<LeaveCancellationRequest[]> {
    try {
      const res = await http.get("/api/leave-cancellations");
      const d = isRecord(res.data) ? (res.data as { data?: unknown }).data : null;
      const items = Array.isArray(d) ? d : [];
      return items.filter(isRecord).map(normalizeRequest);
    } catch {
      return [];
    }
  },
};
