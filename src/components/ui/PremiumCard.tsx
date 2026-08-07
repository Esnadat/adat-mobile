import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import { shadowCard, shadowMedium } from "../../theme/shadows";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Larger radius and padding for hero sections */
  hero?: boolean;
  /** Blue-tinted surface for summary and financial hero cards */
  tinted?: boolean;
};

export function PremiumCard({ children, style, hero, tinted }: Props) {
  return (
    <View
      style={[
        styles.base,
        hero ? styles.hero : styles.normal,
        tinted && styles.tinted,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: "hidden",
    ...shadowCard,
  },
  normal: {
    borderRadius: 16,
    padding: 20,
  },
  hero: {
    borderRadius: 20,
    padding: 24,
  },
  tinted: {
    backgroundColor: colors.surfaceElevated,
    ...shadowMedium,
  },
});
