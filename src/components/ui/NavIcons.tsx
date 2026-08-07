import React from "react";
import { Ionicons } from "../../../node_modules/expo/node_modules/@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";

/** Re-export for screens — resolves nested Expo dependency without a top-level package.json entry. */
export { Ionicons };

const TAB_ICON_SIZE = 22;
const FP_CENTER_SIZE = 26;
const FP_TAB_SIZE = 22;

function TabIconWrap({ children }: { children: React.ReactNode }) {
  return <View style={styles.tabSlot}>{children}</View>;
}

export function NavPersonIcon({ active }: { active: boolean }) {
  const color = active ? colors.successDark : colors.textMuted;
  return (
    <TabIconWrap>
      <Ionicons name="person-outline" size={TAB_ICON_SIZE} color={color} />
    </TabIconWrap>
  );
}

export function NavDocumentIcon({ active }: { active: boolean }) {
  const color = active ? colors.successDark : colors.textMuted;
  return (
    <TabIconWrap>
      <Ionicons name="document-text-outline" size={TAB_ICON_SIZE} color={color} />
    </TabIconWrap>
  );
}

export function NavFingerprintIcon({
  active,
  size = "normal",
  onPrimary = false,
}: {
  active: boolean;
  size?: "normal" | "large";
  onPrimary?: boolean;
}) {
  const large = size === "large";
  const iconSize = large ? FP_CENTER_SIZE : FP_TAB_SIZE;
  const slot = large ? styles.fpCenterSlot : styles.fpTabSlot;

  let color = colors.textMuted;
  if (onPrimary) {
    color = colors.white;
  } else if (active) {
    color = colors.successDark;
  } else if (large) {
    color = colors.ink;
  }

  const mutedIdleCenter = large && !active && !onPrimary;

  const icon = <Ionicons name="finger-print-outline" size={iconSize} color={color} />;

  if (mutedIdleCenter) {
    return <View style={[slot, styles.fpMutedIdle]}>{icon}</View>;
  }

  return <View style={slot}>{icon}</View>;
}

export function NavCalendarIcon({ active }: { active: boolean }) {
  const color = active ? colors.successDark : colors.textMuted;
  return (
    <TabIconWrap>
      <Ionicons name="calendar-outline" size={TAB_ICON_SIZE} color={color} />
    </TabIconWrap>
  );
}

export function NavGridIcon({ active }: { active: boolean }) {
  const color = active ? colors.successDark : colors.textMuted;
  return (
    <TabIconWrap>
      <Ionicons name="grid-outline" size={TAB_ICON_SIZE} color={color} />
    </TabIconWrap>
  );
}

const styles = StyleSheet.create({
  tabSlot: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  fpTabSlot: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  fpCenterSlot: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  fpMutedIdle: {
    opacity: 0.55,
  },
});
