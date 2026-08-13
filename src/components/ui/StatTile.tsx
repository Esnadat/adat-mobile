import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { shadowSoft } from "../../theme/shadows";

export type StatTileTone = "success" | "danger" | "warning" | "neutral" | "brand";

const toneMap: Record<StatTileTone, { iconBg: string; iconFg: string; value: string }> = {
  success: { iconBg: colors.successLight, iconFg: colors.successDark, value: colors.ink },
  danger: { iconBg: colors.dangerLight, iconFg: colors.danger, value: colors.ink },
  warning: { iconBg: colors.warningLight, iconFg: colors.warning, value: colors.ink },
  neutral: { iconBg: colors.surfaceSubtle, iconFg: colors.textMuted, value: colors.ink },
  brand: { iconBg: colors.primaryLight, iconFg: colors.primaryDark, value: colors.ink },
};

type Props = {
  /** An icon element (e.g. <Ionicons ... />). Rendered inside the colored square. */
  icon: React.ReactNode;
  value: string | number;
  label: string;
  tone?: StatTileTone;
  /** Right-align text for RTL layouts. */
  isAr?: boolean;
  style?: ViewStyle;
};

/**
 * Compact stat card matching the adat statement design: a colored, rounded icon
 * square above a large tabular number and a caption label. Three of these sit in a
 * row (each with flex:1) for the month present / incomplete / absent summary.
 */
export function StatTile({ icon, value, label, tone = "neutral", isAr, style }: Props) {
  const t = toneMap[tone] ?? toneMap.neutral;
  const align = isAr ? "right" : "left";
  return (
    <View style={[styles.tile, style]}>
      <View style={[styles.iconSquare, { backgroundColor: t.iconBg }]}>{icon}</View>
      <Text style={[styles.value, { color: t.value, textAlign: align }]} numberOfLines={1}>
        {String(value)}
      </Text>
      <Text style={[styles.label, { textAlign: align }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    ...shadowSoft,
  },
  iconSquare: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
    fontVariant: ["tabular-nums"],
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    lineHeight: 15,
  },
});
