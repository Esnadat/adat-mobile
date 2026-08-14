import React from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import * as Application from "expo-application";
import { DetailShell } from "../components/ui/DetailShell";
import { Ionicons } from "../components/ui/NavIcons";
import { useAppLocale } from "../i18n/LocaleContext";
import { i18n } from "../i18n";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { shadowSoft } from "../theme/shadows";

const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "support@adathr.com";

function LinkRow({ icon, label, onPress, isAr }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void; isAr: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.linkRow, isAr && styles.rowReverse, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={colors.primaryDark} />
      <Text style={[styles.linkLabel, { textAlign: isAr ? "right" : "left" }]}>{label}</Text>
      <Ionicons name={isAr ? "chevron-back" : "chevron-forward"} size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export function AboutScreen() {
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const version = Application.nativeApplicationVersion ?? "1.0.0";
  const build = Application.nativeBuildVersion ?? "";

  return (
    <DetailShell title={i18n.t("aboutTitle")}>
      <View style={styles.brandCard}>
        <Image source={require("../../assets/branding/adat-logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.caption}>{isAr ? "بوابة الموظف" : "Employee Portal"}</Text>
        <Text style={styles.version}>{`${isAr ? "الإصدار" : "Version"} ${version}${build ? ` (${build})` : ""}`}</Text>
      </View>

      <View style={styles.card}>
        <LinkRow icon="mail-outline" label={isAr ? "الدعم الفني" : "Support"} onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} isAr={isAr} />
        <View style={styles.divider} />
        <LinkRow icon="shield-checkmark-outline" label={isAr ? "سياسة الخصوصية" : "Privacy Policy"} onPress={() => void Linking.openURL("https://adathr.com/privacy")} isAr={isAr} />
        <View style={styles.divider} />
        <LinkRow icon="globe-outline" label="adathr.com" onPress={() => void Linking.openURL("https://adathr.com")} isAr={isAr} />
      </View>

      <Text style={styles.footer}>© {new Date().getFullYear()} Esnadat</Text>
    </DetailShell>
  );
}

const styles = StyleSheet.create({
  rowReverse: { flexDirection: "row-reverse" },
  brandCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xxl,
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.lg,
    ...shadowSoft,
  },
  logo: { width: 150, height: 34, opacity: 0.82 },
  caption: { fontSize: 12, fontWeight: "600", color: colors.textMuted, letterSpacing: 0.15 },
  version: { fontSize: 12.5, fontWeight: "800", color: colors.textSecondary, fontVariant: ["tabular-nums"], marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    ...shadowSoft,
  },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 15, minHeight: 48 },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.ink },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
  pressed: { opacity: 0.7 },
  footer: { textAlign: "center", fontSize: 11, fontWeight: "600", color: colors.textMuted, marginTop: spacing.xl },
});
