import { Ionicons } from "../ui/NavIcons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PremiumCard } from "../ui/PremiumCard";
import { i18n } from "../../i18n";
import { colors } from "../../theme/colors";
import { homeSectionStyles } from "./homeSectionStyles";

type Props = {
  isAr: boolean;
  onRequests: () => void;
  onPayroll: () => void;
  onCalendar: () => void;
  onProfile: () => void;
};

export function HomePortalShortcuts({ isAr, onRequests, onPayroll, onCalendar, onProfile }: Props) {
  const shortcuts = [
    {
      key: "req",
      titleKey: "homeShortcutRequestsTitle",
      hintKey: "homeShortcutRequestsHint",
      icon: "document-text-outline" as const,
      onPress: onRequests,
    },
    {
      key: "pay",
      titleKey: "homeShortcutPayrollTitle",
      hintKey: "homeShortcutPayrollHint",
      icon: "wallet-outline" as const,
      onPress: onPayroll,
    },
    {
      key: "cal",
      titleKey: "homeShortcutCalendarTitle",
      hintKey: "homeShortcutCalendarHint",
      icon: "calendar-outline" as const,
      onPress: onCalendar,
    },
    {
      key: "prof",
      titleKey: "homeShortcutProfileTitle",
      hintKey: "homeShortcutProfileHint",
      icon: "person-outline" as const,
      onPress: onProfile,
    },
  ];

  const titleAlign = isAr ? "right" : "left";

  return (
    <PremiumCard style={homeSectionStyles.card}>
      <Text style={[homeSectionStyles.sectionTitle, { textAlign: titleAlign }]}>{i18n.t("homeShortcutsSection")}</Text>
      <View style={styles.grid}>
        {shortcuts.map((s, idx) => (
          <Pressable
            key={s.key}
            onPress={s.onPress}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            accessibilityRole="button"
          >
            <View style={[styles.iconPlate, idx % 2 === 0 ? styles.iconPlatePrimary : styles.iconPlateSecondary]}>
              <Ionicons name={s.icon} size={22} color={colors.ink} />
            </View>
            <Text style={[styles.tileTitle, { textAlign: titleAlign }]} numberOfLines={2}>
              {i18n.t(s.titleKey)}
            </Text>
            <Text style={[styles.tileHint, { textAlign: titleAlign }]} numberOfLines={2}>
              {i18n.t(s.hintKey)}
            </Text>
          </Pressable>
        ))}
      </View>
    </PremiumCard>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  tile: {
    width: "48%",
    flexGrow: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 10,
    minHeight: 90,
    justifyContent: "center",
    gap: 6,
  },
  tilePressed: { opacity: 0.92 },
  iconPlate: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPlatePrimary: {
    backgroundColor: colors.surfaceSubtle,
  },
  iconPlateSecondary: {
    backgroundColor: colors.surfaceElevated,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.1,
    lineHeight: 17,
  },
  tileHint: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    lineHeight: 15,
  },
});
