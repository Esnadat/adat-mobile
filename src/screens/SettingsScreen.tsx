import React from "react";
import { Alert, I18nManager, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PremiumCard } from "../components/ui/PremiumCard";
import { SectionTitle } from "../components/ui/SectionTitle";
import { useAppLocale } from "../i18n/LocaleContext";
import { i18n } from "../i18n";
import { colors } from "../theme/colors";
import { ENV } from "../config/env";

export function SettingsScreen() {
  const { locale, setLocale } = useAppLocale();
  const isAr = locale === "ar";

  const openUrl = (url: string) => {
    void Linking.openURL(url).catch(() => {});
  };
  const requestAccountDeletion = () => {
    Alert.alert(i18n.t("deleteAccountConfirmTitle"), i18n.t("deleteAccountConfirmBody"), [
      { text: i18n.t("commonCancel"), style: "cancel" },
      {
        text: i18n.t("deleteAccountConfirmCta"),
        style: "destructive",
        onPress: () => {
          const subject = encodeURIComponent(i18n.t("deleteAccountEmailSubject"));
          const body = encodeURIComponent(i18n.t("deleteAccountEmailBody"));
          void Linking.openURL(`mailto:${ENV.supportEmail}?subject=${subject}&body=${body}`).catch(() => {});
        },
      },
    ]);
  };

  const toggleLanguage = () => {
    const next = isAr ? "en" : "ar";
    setLocale(next);
    I18nManager.allowRTL(next === "ar");
  };

  return (
    <ScrollView
      style={styles.outer}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <SectionTitle title={i18n.t("settingsTitle")} />
      <PremiumCard style={styles.card}>
        <Text style={styles.label}>{i18n.t("languageLabel")}</Text>
        <Pressable
          onPress={toggleLanguage}
          style={({ pressed }) => [styles.rowBtn, pressed && styles.rowBtnPressed]}
        >
          <Text style={styles.rowBtnText}>{isAr ? "العربية" : "English"}</Text>
          <Text style={styles.rowBtnMeta}>{isAr ? "EN" : "عربي"}</Text>
        </Pressable>
      </PremiumCard>

      <PremiumCard style={styles.card}>
        <Text style={styles.label}>{i18n.t("appearanceLabel")}</Text>
        <View style={[styles.appearanceRow, isAr && styles.appearanceRowAr]}>
          <View style={[styles.appearanceChip, styles.appearanceChipActive]}>
            <Text style={styles.appearanceChipText}>{i18n.t("appearanceLight")}</Text>
          </View>
          <View style={styles.appearanceChip}>
            <Text style={styles.appearanceChipText}>{i18n.t("appearanceDark")}</Text>
          </View>
        </View>
        <Text style={[styles.appearanceHint, isAr && styles.textRtl]}>{i18n.t("appearanceComingSoon")}</Text>
      </PremiumCard>
      <PremiumCard style={styles.card}>
        <Text style={styles.label}>{i18n.t("legalSectionTitle")}</Text>
        <Pressable onPress={() => openUrl(ENV.privacyUrl)} style={({ pressed }) => [styles.rowBtn, pressed && styles.rowBtnPressed]}>
          <Text style={styles.rowBtnText}>{i18n.t("privacyPolicy")}</Text>
          <Text style={styles.rowBtnMeta}>{"\u2197"}</Text>
        </Pressable>
        <Pressable onPress={() => openUrl(ENV.termsUrl)} style={({ pressed }) => [styles.rowBtn, pressed && styles.rowBtnPressed]}>
          <Text style={styles.rowBtnText}>{i18n.t("termsOfService")}</Text>
          <Text style={styles.rowBtnMeta}>{"\u2197"}</Text>
        </Pressable>
      </PremiumCard>

      <PremiumCard style={styles.card}>
        <Text style={styles.label}>{i18n.t("accountSectionTitle")}</Text>
        <Text style={[styles.appearanceHint, isAr && styles.textRtl]}>{i18n.t("deleteAccountDesc")}</Text>
        <Pressable onPress={requestAccountDeletion} style={({ pressed }) => [styles.rowBtn, styles.dangerBtn, pressed && styles.rowBtnPressed]}>
          <Text style={[styles.rowBtnText, styles.dangerText]}>{i18n.t("deleteAccount")}</Text>
          <Text style={[styles.rowBtnMeta, styles.dangerText]}>{"\u203A"}</Text>
        </Pressable>
      </PremiumCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  dangerBtn: { borderColor: "#FECACA" },
  dangerText: { color: "#DC2626" },
  outer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 12,
  },
  rowBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  rowBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  rowBtnMeta: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.successDark,
  },
  appearanceRow: {
    flexDirection: "row",
    gap: 8,
  },
  appearanceRowAr: {
    flexDirection: "row-reverse",
  },
  appearanceChip: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
  },
  appearanceChipActive: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  appearanceChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  appearanceHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  textRtl: {
    textAlign: "right",
  },
});
