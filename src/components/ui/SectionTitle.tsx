import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppLocale } from "../../i18n/LocaleContext";
import { colors } from "../../theme/colors";

type Props = {
  title: string;
  subtitle?: string;
};

export function SectionTitle({ title, subtitle }: Props) {
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, isAr ? styles.titleAr : styles.titleEn]}>{title}</Text>
      <View style={[styles.accent, isAr && styles.accentAr]} />
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 22, paddingBottom: 4 },
  title: {
    fontSize: 23,
    fontWeight: "800",
    color: colors.ink,
    lineHeight: 28,
  },
  titleEn: { letterSpacing: -0.4 },
  titleAr: { letterSpacing: 0 },
  accent: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 5,
    alignSelf: "flex-start",
  },
  accentAr: { alignSelf: "flex-end" },
  sub: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
