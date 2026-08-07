import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";

type Props = {
  label: string;
  value: string;
  sub?: string;
  /** When true, label/value/sub use right alignment for Arabic layouts. */
  isAr?: boolean;
};

export function InfoRow({ label, value, sub, isAr = false }: Props) {
  const textAlign = isAr ? "right" : "left";
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { textAlign }]}>{label}</Text>
      <Text style={[styles.value, { textAlign }]}>{value}</Text>
      {sub ? <Text style={[styles.sub, { textAlign }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 23,
    letterSpacing: -0.15,
  },
  sub: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    fontWeight: "500",
  },
});
