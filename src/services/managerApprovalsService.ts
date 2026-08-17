import { http } from "./http";

export type ApprovalItemType = "leave" | "permission" | "cancel_leave";

/** A unified item awaiting the current manager's approval (from the BFF aggregation). */
export interface ApprovalItem {
  id: string;
  type: ApprovalItemType;
  employeeId: string;
  employeeName: string;
  reason?: string;
  status?: string;
  createdAt?: string;
  // leave / cancel_leave
  fromDate?: string;
  toDate?: string;
  leaveType?: string;
  leaveApplication?: string;
  // permission
  permissionDate?: string;
  startTime?: string;
  endTime?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}
function str(v: unknown): string {
  return String(v ?? "").trim();
}

function normalize(raw: Record<string, unknown>): ApprovalItem | null {
  const id = str(raw.id);
  const t = str(raw.type);
  if (!id || (t !== "leave" && t !== "permission" && t !== "cancel_leave")) return null;
  return {
    id,
    type: t,
    employeeId: str(raw.employeeId),
    employeeName: str(raw.employeeName),
    reason: str(raw.reason) || undefined,
    status: str(raw.status) || undefined,
    createdAt: str(raw.createdAt) || undefined,
    fromDate: str(raw.fromDate) || undefined,
    toDate: str(raw.toDate) || undefined,
    leaveType: str(raw.leaveType) || undefined,
    leaveApplication: str(raw.leaveApplication) || undefined,
    permissionDate: str(raw.permissionDate) || undefined,
    startTime: str(raw.startTime) || undefined,
    endTime: str(raw.endTime) || undefined,
  };
}

function endpointFor(item: ApprovalItem, action: "approve" | "reject"): string {
  const id = encodeURIComponent(item.id);
  if (item.type === "leave") return `/api/manager/leave-applications/${id}/${action}`;
  if (item.type === "permission") return `/api/manager/permission-requests/${id}/${action}`;
  return `/api/manager/leave-cancellations/${id}/${action}`;
}

export const managerApprovalsService = {
  /**
   * Pending items awaiting this manager. `isManager` is false when the BFF denies
   * access (non-managers) — used to hide the approvals tab entirely.
   */
  async listPending(): Promise<{ items: ApprovalItem[]; isManager: boolean }> {
    try {
      const res = await http.get("/api/manager/pending-leave-approvals");
      const d = isRecord(res.data) ? (res.data as { data?: unknown }).data : null;
      const items = Array.isArray(d) ? d.filter(isRecord).map(normalize).filter((x): x is ApprovalItem => x !== null) : [];
      return { items, isManager: true };
    } catch {
      return { items: [], isManager: false };
    }
  },

  async approve(item: ApprovalItem): Promise<void> {
    await http.post(endpointFor(item, "approve"), {});
  },
  async reject(item: ApprovalItem): Promise<void> {
    await http.post(endpointFor(item, "reject"), {});
  },
};
