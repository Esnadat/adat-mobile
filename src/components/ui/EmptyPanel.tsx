import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { shadowSoft } from "../../theme/shadows";

type Props = {
  title: string;
  hint: string;
  children?: React.ReactNode;
};

export function EmptyPanel({ title, hint, children }: Props) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowSoft,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 16,
  },
});
