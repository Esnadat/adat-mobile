import { CreateRequestPayload, EmployeeRequest, LeaveBalanceCheckResult, RequestStatus, RequestType } from "../types/api";
import { IDEMPOTENCY_HEADER } from "../utils/idempotency";

/** Build an axios config that carries the idempotency header, when a key is provided. */
function idempotencyConfig(opts?: { idempotencyKey?: string }) {
  return opts?.idempotencyKey ? { headers: { [IDEMPOTENCY_HEADER]: opts.idempotencyKey } } : undefined;
}
import { AxiosError } from "axios";
import { http } from "./http";

const DEBUG_MOBILE_REQUESTS = false;

function sanitizePayload(payload: Record<string, unknown>) {
  const sanitized = { ...payload };
  if ("description" in sanitized) sanitized.description = "***";
  if ("reason" in sanitized) sanitized.reason = "***";
  return sanitized;
}

function logRequestStart(url: string, payload: Record<string, unknown>) {
  if (__DEV__ && DEBUG_MOBILE_REQUESTS) {
    console.log("[mobile-requests] request", { url, payload: sanitizePayload(payload) });
  }
}

function logRequestSuccess(url: string, status: number) {
  if (__DEV__ && DEBUG_MOBILE_REQUESTS) {
    console.log("[mobile-requests] response", { url, status });
  }
}

function logRequestFailure(url: string, error: unknown) {
  if (__DEV__ && DEBUG_MOBILE_REQUESTS) {
    const axiosError = error as AxiosError;
    console.log("[mobile-requests] error", { url, status: axiosError.response?.status });
  }
}

// ── Response normalisation ────────────────────────────────────────────────────

type RawRow = Record<string, unknown>;
type MobileLeaveType = {
  id: string;
  name: string;
  label: string;
  balance?: number | null;
};

function normalizeRequestStatus(raw: unknown): RequestStatus {
  const s = String(raw ?? "").toLowerCase().trim();
  if (s === "approved") return "approved";
  if (s === "cancelled") return "cancelled";
  if (s === "rejected") return "rejected";
  if (s === "completed" || s === "closed") return "approved";
  // "open", "draft", "pending", workflow states → pending
  return "pending";
}

function str(v: unknown): string {
  return String(v ?? "").trim();
}

function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Maps API `type` strings to mobile `RequestType`; returns null if unrecognized. */
function mapApiTypeToRequestType(typeNorm: string): RequestType | null {
  const n = typeNorm.replace(/-/g, "_");
  const map: Record<string, RequestType> = {
    leave: "leave",
    leave_application: "leave",
    permission: "permission",
    permission_request: "permission",
    support: "support",
    support_request: "support",
    support_ticket: "support",
    missed_punch: "missed_punch",
    missedpunch: "missed_punch",
    fingerprint_missed: "missed_punch",
    missed_biometric: "missed_punch",
    attendance_adjustment: "attendance_adjustment",
    attendanceadjustment: "attendance_adjustment",
    attendance_reconciliation: "attendance_adjustment",
    attendance_settlement: "attendance_adjustment",
    device_change: "device_change",
    change_device: "device_change",
    attendance_device_change: "device_change",
    overtime: "overtime",
    extra_hours: "overtime",
    overtime_request: "overtime",
  };
  return map[n] ?? null;
}

function normalizeRequestRow(raw: RawRow): EmployeeRequest | null {
  const id = str(raw.id ?? raw.name);
  if (!id) return null;

  const typeNorm = str(raw.type).toLowerCase().replace(/\s+/g, "_");
  if (typeNorm === "support" || typeNorm === "support_request" || typeNorm === "support_ticket") {
    const status = normalizeRequestStatus(raw.status);
    const reason = str(raw.description ?? raw.reason ?? raw.message ?? raw.subject);
    const createdAt = str(raw.created_at ?? raw.creation ?? raw.modified ?? raw.created);
    return {
      id,
      type: "support",
      reason,
      status,
      createdAt,
      subject: str(raw.subject),
      category: str(raw.category),
      priority: str(raw.priority),
      description: str(raw.description ?? raw.details),
    };
  }

  const mapped = mapApiTypeToRequestType(typeNorm);
  if (!mapped) return null;

  const status = normalizeRequestStatus(raw.status);
  const reason = str(raw.reason);
  const createdAt = str(raw.created_at ?? raw.creation ?? raw.modified ?? raw.created);

  const approver = str(raw.approver ?? raw.leave_approver) || undefined;
  const modifiedAt = str(raw.modified_at ?? raw.modified) || undefined;

  if (mapped === "leave") {
    const fromDate = str(raw.date) || undefined;
    const toDate = str(raw.to_date ?? raw.end_date ?? raw.date) || undefined;
    return {
      id,
      type: "leave",
      reason,
      status,
      createdAt,
      fromDate,
      toDate,
      approver,
      modifiedAt,
    };
  }

  if (mapped === "permission") {
    return {
      id,
      type: "permission",
      reason,
      status,
      createdAt,
      permissionDate: str(raw.date) || undefined,
      startTime: str(raw.start_time) || undefined,
      endTime: str(raw.end_time) || undefined,
      approver,
      modifiedAt,
    };
  }

  if (mapped === "missed_punch" || mapped === "attendance_adjustment" || mapped === "overtime") {
    const permissionDate = str(raw.date ?? raw.permission_date ?? raw.from_date) || undefined;
    return {
      id,
      type: mapped,
      reason: str(raw.reason ?? raw.description ?? raw.message),
      status,
      createdAt,
      permissionDate,
    };
  }

  return null;
}

function normalizeSupportTicketRow(raw: RawRow): EmployeeRequest | null {
  const id = str(raw.id ?? raw.name ?? raw.ticket_id ?? raw.ticket_no);
  if (!id) return null;

  const status = normalizeRequestStatus(raw.status ?? raw.workflow_state ?? raw.state);
  const createdAt = str(raw.created_at ?? raw.creation ?? raw.modified ?? raw.created);
  const subject = str(raw.title ?? raw.subject ?? raw.name);
  const description = str(raw.description ?? raw.details ?? raw.message);
  const reason = description || subject;

  return {
    id,
    type: "support",
    reason,
    status,
    createdAt,
    subject,
    category: str(raw.category),
    priority: str(raw.priority),
    description,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export const requestService = {
  // Mobile app reuses existing portal-api request creation contracts from web services.
  async createRequest(payload: CreateRequestPayload, opts?: { idempotencyKey?: string }) {
    if (payload.type !== "leave" && payload.type !== "permission" && payload.type !== "support") {
      throw new Error("Unsupported request type for mobile submission");
    }
    const cfg = idempotencyConfig(opts);

    if (payload.type === "leave") {
      const url = "/api/resource/Leave Application";
      const body: {
        leave_type: string;
        from_date: string;
        to_date: string;
        description: string;
      } = {
        leave_type: (payload.leaveType || "Annual Leave").trim(),
        from_date: String(payload.fromDate || "").trim(),
        to_date: String(payload.toDate || "").trim(),
        description: payload.reason.trim(),
      };
      if (__DEV__ && DEBUG_MOBILE_REQUESTS) {
        console.log("[mobile-requests] leave payload", {
          leave_type: body.leave_type,
          from_date: body.from_date,
          to_date: body.to_date,
          hasDescription: body.description.length > 0,
        });
      }
      try {
        const response = await http.post(url, body, cfg);
        logRequestSuccess(url, response.status);
        return response;
      } catch (error) {
        logRequestFailure(url, error);
        throw error;
      }
    }

    if (payload.type === "permission") {
      const url = "/api/permissions";
      const body = {
        permission_date: payload.permissionDate,
        start_time: payload.startTime,
        end_time: payload.endTime,
        reason: payload.reason.trim(),
      };
      logRequestStart(url, body);
      try {
        const response = await http.post(url, body, cfg);
        logRequestSuccess(url, response.status);
        return response;
      } catch (error) {
        logRequestFailure(url, error);
        throw error;
      }
    }

    return this.createSupportTicket(
      {
        title: String(payload.subject ?? "").trim(),
        description: String(payload.description ?? "").trim(),
        category: String(payload.category ?? "").trim(),
        priority: String(payload.priority ?? "").trim(),
      },
      opts
    );
  },

  async createSupportTicket(
    payload: {
      title: string;
      description: string;
      category: string;
      priority: string;
    },
    opts?: { idempotencyKey?: string }
  ) {
    const url = "/api/support/tickets";
    const body = {
      title: payload.title.trim(),
      description: payload.description.trim(),
      category: payload.category.trim(),
      priority: payload.priority.trim(),
    };
    logRequestStart(url, body);
    try {
      const response = await http.post(url, body, idempotencyConfig(opts));
      logRequestSuccess(url, response.status);
      return response;
    } catch (error) {
      logRequestFailure(url, error);
      throw error;
    }
  },

  /**
   * Current user's submitted requests.
   * Endpoint: GET /api/requests (no scope param — "my" is invalid; omit for self).
   * Response shape: { ok: boolean; data: RawRow[]; limit: number; offset: number; has_more: boolean }
   * Rows are normalised from backend field names (date, to_date, created_at, status "Open"/"Approved"/"Rejected")
   * into mobile EmployeeRequest fields (fromDate, toDate, createdAt, status "pending"/"approved"/"rejected").
   */
  async getMyRequests(): Promise<EmployeeRequest[]> {
    const url = "/api/requests";
    try {
      const response = await http.get<Record<string, unknown>>(url);
      const body = response.data;

      if (__DEV__ && DEBUG_MOBILE_REQUESTS) {
        const topLevelKeys = body && typeof body === "object" ? Object.keys(body) : [];
        const rows = Array.isArray(body?.data) ? (body.data as unknown[]) : [];
        console.log("[mobile-requests] getMyRequests", {
          url,
          status: response.status,
          topLevelKeys,
          hasData: Array.isArray(body?.data),
          hasItems: Array.isArray((body as Record<string, unknown>)?.items),
          hasRequests: Array.isArray((body as Record<string, unknown>)?.requests),
          hasRows: Array.isArray((body as Record<string, unknown>)?.rows),
          itemCount: rows.length,
          hasMore: body?.has_more ?? null,
        });
      }

      const rows = Array.isArray(body?.data)
        ? (body.data as RawRow[])
        : Array.isArray(body)
        ? (body as RawRow[])
        : [];

      return rows.map(normalizeRequestRow).filter((r): r is EmployeeRequest => r !== null);
    } catch (error) {
      logRequestFailure(url, error);
      throw error;
    }
  },

  /**
   * Cancel (withdraw) the current user's own pending request.
   * Endpoint: POST /api/requests/:id/cancel  body: { type }
   * The BFF enforces company scope, ownership (must be the applicant) and pending-only,
   * then withdraws the draft. Non-pending / not-owned requests are rejected server-side.
   */
  async cancelRequest(id: string, type: RequestType): Promise<void> {
    const url = `/api/requests/${encodeURIComponent(id)}/cancel`;
    try {
      const response = await http.post(url, { type });
      logRequestSuccess(url, response.status);
    } catch (error) {
      logRequestFailure(url, error);
      throw error;
    }
  },

  async getMySupportTickets(): Promise<EmployeeRequest[]> {
    const url = "/api/support/tickets";
    try {
      const response = await http.get<Record<string, unknown>>(url);
      const body = response.data;
      const rows = Array.isArray(body?.data)
        ? (body.data as RawRow[])
        : Array.isArray((body as Record<string, unknown>)?.items)
        ? ((body as Record<string, unknown>).items as RawRow[])
        : Array.isArray(body)
        ? (body as RawRow[])
        : [];

      return rows.map(normalizeSupportTicketRow).filter((r): r is EmployeeRequest => r !== null);
    } catch (error) {
      logRequestFailure(url, error);
      throw error;
    }
  },

  async getLeaveTypes(): Promise<MobileLeaveType[]> {
    const url = "/api/leave/types";
    try {
      const response = await http.get<Record<string, unknown>>(url, {
      });
      const body = response.data;
      if (body && typeof body === "object" && body.ok === false) {
        const msg = typeof body.message === "string" && body.message.trim() ? body.message.trim() : "Failed to load leave types";
        throw new Error(msg);
      }

      const dataLayer = body?.data;
      const inner =
        dataLayer && typeof dataLayer === "object" && !Array.isArray(dataLayer)
          ? (dataLayer as Record<string, unknown>)
          : null;
      const nestedItems =
        inner?.data && typeof inner.data === "object" && !Array.isArray(inner.data)
          ? ((inner.data as Record<string, unknown>).items as unknown)
          : undefined;

      const rows = Array.isArray(inner?.items)
        ? (inner.items as RawRow[])
        : Array.isArray(nestedItems)
        ? (nestedItems as RawRow[])
        : Array.isArray((body as Record<string, unknown>)?.items)
        ? ((body as Record<string, unknown>).items as RawRow[])
        : Array.isArray(body?.message)
        ? (body.message as RawRow[])
        : Array.isArray(body?.data)
        ? (body.data as RawRow[])
        : Array.isArray(body)
        ? (body as RawRow[])
        : [];

      return rows
        .map((row) => {
          const name = str(row.name) || str(row.id);
          const label = str(row.label) || str(row.leave_type_name) || name;
          if (!name) return null;
          return {
            id: name,
            name,
            label: label || name,
            balance: numOrNull(row.balance),
          } as MobileLeaveType;
        })
        .filter((x): x is MobileLeaveType => x !== null);
    } catch (error) {
      logRequestFailure(url, error);
      throw error;
    }
  },

  async checkLeaveBalance(params: {
    leaveType: string;
    fromDate: string;
    toDate: string;
  }): Promise<LeaveBalanceCheckResult> {
    const url = "/api/leaves/balance-check";
    try {
      const response = await http.get<Record<string, unknown>>(url, {
        params: {
          leave_type: String(params.leaveType || "").trim(),
          from_date: String(params.fromDate || "").trim(),
          to_date: String(params.toDate || "").trim(),
        },
      });
      const body = response.data;
      const raw =
        body && typeof body === "object" && body.data && typeof body.data === "object"
          ? (body.data as Record<string, unknown>)
          : body;

      return {
        canSubmit: Boolean(raw?.canSubmit),
        requestedDays: numOrNull(raw?.requestedDays),
        availableDays: numOrNull(raw?.availableDays),
        missingReason:
          raw?.missingReason === "NO_ALLOCATION" ||
          raw?.missingReason === "OUTSIDE_ALLOCATION_PERIOD" ||
          raw?.missingReason === "INSUFFICIENT_BALANCE"
            ? raw.missingReason
            : null,
        allocation: (raw?.allocation as unknown) ?? null,
        leaveType: str(raw?.leaveType),
        fromDate: str(raw?.fromDate),
        toDate: str(raw?.toDate),
      };
    } catch (error) {
      logRequestFailure(url, error);
      throw error;
    }
  },

  /**
   * Team / escalated list when needed: GET /api/requests?scope=team.
   */
  async getTeamRequests(): Promise<EmployeeRequest[]> {
    const url = "/api/requests";
    try {
      const response = await http.get<Record<string, unknown>>(url, {
        params: { scope: "team" },
      });
      const body = response.data;
      const rows = Array.isArray(body?.data)
        ? (body.data as RawRow[])
        : Array.isArray(body)
        ? (body as RawRow[])
        : [];
      return rows.map(normalizeRequestRow).filter((r): r is EmployeeRequest => r !== null);
    } catch (error) {
      logRequestFailure(url, error);
      throw error;
    }
  },
};
