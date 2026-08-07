import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";

export type StatusPillTone = "success" | "warning" | "danger" | "neutral";

const toneMap: Record<StatusPillTone, { bg: string; fg: string }> = {
  success: { bg: colors.successLight, fg: colors.successDark },
  warning: { bg: colors.warningLight, fg: colors.warning },
  danger: { bg: colors.dangerLight, fg: colors.danger },
  neutral: { bg: colors.background, fg: colors.textMuted },
};

type Props = {
  label: string;
  tone: StatusPillTone;
  numberOfLines?: number;
};

export function StatusPill({ label, tone, numberOfLines }: Props) {
  const t = toneMap[tone] ?? toneMap.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.txt, { color: t.fg }]} numberOfLines={numberOfLines}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  txt: {
    fontSize: 12,
    fontWeight: "700",
  },
});
