import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";

type Props = {
  label: string;
  amount: string;
  emphasize?: boolean;
  /** Mirror row for Arabic so label sits at the reading start. */
  isAr?: boolean;
};

export function MoneyRow({ label, amount, emphasize, isAr = false }: Props) {
  const textAlign = isAr ? "right" : "left";
  return (
    <View style={[styles.row, isAr && styles.rowAr]}>
      <Text style={[styles.label, { textAlign }]}>{label}</Text>
      <Text style={[styles.amount, emphasize && styles.amountEm, isAr && styles.amountLtr]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowAr: { flexDirection: "row-reverse" },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    paddingEnd: 12,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  amountEm: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  amountLtr: { writingDirection: "ltr" },
});
