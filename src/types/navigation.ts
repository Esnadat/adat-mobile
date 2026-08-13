export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type TabId = "notifications" | "requests" | "attendance" | "calendar" | "more";

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
