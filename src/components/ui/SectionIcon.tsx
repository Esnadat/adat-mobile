import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "./NavIcons";
import { colors } from "../../theme/colors";

type Tone = "neutral" | "success";

type Props = {
  name: React.ComponentProps<typeof Ionicons>["name"];
  tone?: Tone;
  size?: number;
};

export function SectionIcon({ name, tone = "neutral", size = 14 }: Props) {
  const success = tone === "success";
  return (
    <View style={[styles.wrap, success ? styles.wrapSuccess : styles.wrapNeutral]}>
      <Ionicons name={name} size={size} color={success ? colors.successDark : colors.ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  wrapNeutral: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
  },
  wrapSuccess: {
    backgroundColor: colors.successLight,
    borderColor: "rgba(13, 138, 78, 0.24)",
  },
});
