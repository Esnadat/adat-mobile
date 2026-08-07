import { Platform, ViewStyle } from "react-native";

/** Subtle shadow for standard content cards */
export const shadowCard: ViewStyle = {
  shadowColor: "#050D18",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: Platform.OS === "ios" ? 0.06 : 0.08,
  shadowRadius: 14,
  elevation: 3,
};

/** Medium shadow for elevated interactive elements and hero cards */
export const shadowMedium: ViewStyle = {
  shadowColor: "#050D18",
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.1,
  shadowRadius: 18,
  elevation: 8,
};

export const shadowFloat: ViewStyle = {
  shadowColor: "#050D18",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 18,
  elevation: 14,
};

export const shadowSoft: ViewStyle = {
  shadowColor: "#050D18",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
};

/**
 * Bottom padding inside scroll views. The main tab bar is fixed outside the scroll area,
 * so this is breathing room only — not clearance for an overlapping float.
 */
export const floatingTabBarBottomInset = 60;
