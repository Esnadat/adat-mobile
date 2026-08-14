/** A single day's computed attendance summary, passed to the shared Day Detail page. */
export type DayDetailParams = {
  date: string; // YYYY-MM-DD
  statusKey?: string; // MobileWorkCalendarDayStatus
  workedMinutes?: number;
  expectedMinutes?: number | null;
  shiftName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  isWorkDay?: boolean;
};

export type RootStackParamList = {
  Login: undefined;
  Main: { tab?: TabId } | undefined;
  DayDetail: DayDetailParams;
  RequestDetail: { id: string; type: string };
  TeamMember: { employee: string; name?: string };
  TaskDetail: { id: string };
  Notifications: undefined;
  About: undefined;
};

export type TabId = "tasks" | "requests" | "attendance" | "calendar" | "more";

/** Sub-views opened from the More tab (same stack as main tabs; no new routes). */
export type MoreStackView =
  | "payroll"
  | "settings"
  | "businessCard"
  | "notifications"
  | "balances"
  | "team"
  | "statement"
  | "profile";
