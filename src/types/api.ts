export type RequestType =
  | "leave"
  | "permission"
  | "support"
  | "missed_punch"
  | "attendance_adjustment"
  | "device_change"
  | "overtime";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface UserSession {
  /** Best-effort employee / doc identifier for display (may match email if API omits) */
  id: string;
  name?: string;
  email: string;
  companyCode: string;
  /** Company label when API sends a name separate from the code */
  companyDisplay?: string;
  /** Optional employee/profile image URL from auth/employee payloads */
  employeePhotoUrl?: string;
  /** Optional enriched employee fields (best effort from existing endpoints) */
  department?: string;
  designation?: string;
  manager?: string;
  branch?: string;
  dateOfJoining?: string;
  employmentType?: string;
  mobile?: string;
  personalEmail?: string;
  workEmail?: string;
  status?: string;
}

export interface LoginOtpPayload {
  companyCode: string;
  email: string;
}

export interface VerifyOtpPayload extends LoginOtpPayload {
  otp: string;
}

export interface CheckInOutPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

export interface CreateRequestPayload {
  type: RequestType;
  reason: string;
  leaveType?: string;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  permissionDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  /** Support ticket (UI / future API); not sent by mobile until backend exists */
  subject?: string;
  category?: string;
  priority?: string;
  description?: string;
}

export type LeaveBalanceMissingReason =
  | "NO_ALLOCATION"
  | "OUTSIDE_ALLOCATION_PERIOD"
  | "INSUFFICIENT_BALANCE"
  | null;

export interface LeaveBalanceCheckResult {
  canSubmit: boolean;
  requestedDays: number | null;
  availableDays: number | null;
  missingReason: LeaveBalanceMissingReason;
  allocation?: unknown | null;
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
}

export interface EmployeeRequest extends CreateRequestPayload {
  id: string;
  status: RequestStatus;
  createdAt: string;
}

export interface EstablishmentAnnouncement {
  id: string;
  company?: string;
  title_ar?: string;
  title_en?: string;
  body_ar?: string;
  body_en?: string;
  starts_on?: string | null;
  ends_on?: string | null;
  is_active?: boolean | number;
  priority?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AnnouncementsCurrentResponse {
  ok?: boolean;
  success?: boolean;
  data?: {
    items?: EstablishmentAnnouncement[];
  };
  items?: EstablishmentAnnouncement[];
}

export interface EmployeeTask {
  id: string;
  company?: string;
  task_number?: string | null;
  title: string;
  description?: string | null;
  assigned_to_employee?: string;
  assigned_to_name?: string;
  assigned_by?: string | null;
  due_date?: string | null;
  priority?: string | null;
  status: "open" | "in_progress" | "completed" | "cancelled" | string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface EmployeeTasksListResponse {
  ok?: boolean;
  success?: boolean;
  data?: {
    items?: EmployeeTask[];
  };
  items?: EmployeeTask[];
}

/** Portal GET /api/attendance/work-schedule/today — `data` body (nullable when no schedule). */
export interface WorkScheduleTodayPayload {
  assignment_id?: string | null;
  work_schedule_id?: string | null;
  work_schedule_name?: string | null;
  date?: string | null;
  day_index?: number | null;
  day_type?: string | null;
  shift_type?: string | null;
  is_work_day?: boolean | null;
}

/** Single day from GET /api/attendance/work-schedule/month. */
export interface WorkScheduleMonthDay {
  date: string;
  day_index?: number | null;
  day_type?: string | null;
  is_work_day?: boolean | null;
  assignment_id?: string | null;
  work_schedule_id?: string | null;
  work_schedule_name?: string | null;
  shift_type?: string | null;
  shift_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  expected_minutes?: number | null;
}

/** Portal GET /api/attendance/work-schedule/month — inner `data`. */
export interface WorkScheduleMonthPayload {
  year: number;
  month: number;
  employee?: string | null;
  employee_name?: string | null;
  work_schedule_id?: string | null;
  work_schedule_name?: string | null;
  items?: WorkScheduleMonthDay[] | null;
}

export type MobileWorkCalendarDayStatus =
  | "off"
  | "scheduled"
  | "complete"
  | "partial"
  | "absent"
  | "unresolved";

/** One cell in the month grid (UI + computed attendance). */
export interface MobileWorkCalendarDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  scheduleDay?: WorkScheduleMonthDay | null;
  workedMinutes: number;
  expectedMinutes: number | null;
  status: MobileWorkCalendarDayStatus;
}

/** Row from GET /api/resource/Employee Checkin (portal-forwarded list). */
export interface EmployeeCheckinLogRow {
  name: string;
  employee?: string | null;
  employee_name?: string | null;
  time: string;
  log_type?: string | null;
  shift?: string | null;
  creation?: string | null;
}

/** Assigned attendance location (geofence center + radius) from GET /api/attendance/location. */
export interface AssignedLocation {
  locationName: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export type CalendarEventType = "task" | "announcement" | "holiday" | "leave" | "permission";

export interface CalendarOverlayEvent {
  id: string;
  type: CalendarEventType;
  date: string;
  endDate?: string | null;
  title: string;
  subtitle?: string | null;
  status?: string | null;
  priority?: string | null;
}

export interface OfficialHoliday {
  date: string;
  name?: string | null;
  description?: string | null;
  weekly_off?: boolean;
}
