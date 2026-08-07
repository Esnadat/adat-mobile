import React, { useRef } from "react";
import { Ionicons } from "../components/ui/NavIcons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ActionTile } from "../components/ui/ActionTile";
import { useAppLocale } from "../i18n/LocaleContext";
import { ScreenShell } from "../components/ui/ScreenShell";
import { useAuth } from "../context/AuthContext";
import { i18n } from "../i18n";
import { colors } from "../theme/colors";
import { floatingTabBarBottomInset, shadowSoft } from "../theme/shadows";

const TILE_ICON = 26;
const SIGNOUT_ICON = 22;

export type MoreScreenProps = {
  onOpenPayroll: () => void;
  onOpenSettings: () => void;
  onOpenBusinessCard: () => void;
};

export function MoreScreen({ onOpenPayroll, onOpenSettings, onOpenBusinessCard }: MoreScreenProps) {
  const { logout } = useAuth();
  const logoutInFlightRef = useRef(false);
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const stroke = colors.ink;
  const soonIcon = colors.textMuted;

  const align = isAr ? "right" : "left";
  const brandCaption = isAr ? "حلول الموارد البشرية" : "Employee Portal";

  return (
    <ScreenShell
      title={i18n.t("moreTitle")}
      subtitle={i18n.t("moreSubtitle")}
      headerDensity="compact"
      contentContainerStyle={{ paddingTop: 2, paddingBottom: floatingTabBarBottomInset + 10 }}
    >
      <View style={styles.contentWrap}>
        <Text style={[styles.hubSectionTitle, { textAlign: align }]}>{i18n.t("profileServicesTitle")}</Text>
        <View style={styles.grid}>
          <ActionTile
            style={styles.tile}
            variant="vertical"
            visualTone="active"
            icon={<Ionicons name="wallet-outline" size={TILE_ICON} color={stroke} />}
            title={i18n.t("morePayroll")}
            subtitle={i18n.t("morePayrollHint")}
            onPress={onOpenPayroll}
            showChevron
          />
          <ActionTile
            style={styles.tile}
            variant="vertical"
            visualTone="active"
            icon={<Ionicons name="card-outline" size={TILE_ICON} color={stroke} />}
            title={isAr ? "بطاقة العمل" : "Business Card"}
            subtitle={isAr ? "بطاقة تعريفك الإلكترونية" : "Your digital employee card"}
            onPress={onOpenBusinessCard}
            showChevron
          />
          <ActionTile
            style={styles.tile}
            variant="vertical"
            visualTone="active"
            icon={<Ionicons name="settings-outline" size={TILE_ICON} color={stroke} />}
            title={i18n.t("moreSettings")}
            subtitle={i18n.t("moreSettingsHint")}
            onPress={onOpenSettings}
            showChevron
          />
        </View>

        <Text style={[styles.hubSectionTitle, styles.hubSectionSpaced, { textAlign: align }]}>
          {i18n.t("comingSoonServices")}
        </Text>
        <View style={[styles.soonBand, { borderColor: colors.border }]}>
          <View style={styles.grid}>
            <ActionTile
              style={styles.tile}
              variant="vertical"
              visualTone="soon"
              icon={<Ionicons name="list-outline" size={TILE_ICON} color={soonIcon} />}
              title={i18n.t("moreTasks")}
              subtitle={i18n.t("moreTasksHint")}
              disabled
            />
            <ActionTile
              style={styles.tile}
              variant="vertical"
              visualTone="soon"
              icon={<Ionicons name="bar-chart-outline" size={TILE_ICON} color={soonIcon} />}
              title={i18n.t("morePerformance")}
              subtitle={i18n.t("morePerfHint")}
              disabled
            />
          </View>
        </View>

        <View pointerEvents="none" style={styles.brandFooterCard}>
          <Image
            source={require("../../assets/branding/esnadat-wordmark.png")}
            style={styles.brandFooterWordmark}
            resizeMode="contain"
          />
          <Text style={styles.brandFooterCaption}>{brandCaption}</Text>
        </View>

        <View style={styles.separator} />
        <Pressable
          style={({ pressed }) => [
            styles.signOut,
            isAr && styles.signOutAr,
            pressed && styles.signOutPressed,
          ]}
          onPress={() => {
            if (logoutInFlightRef.current) return;
            logoutInFlightRef.current = true;
            void logout().finally(() => {
              logoutInFlightRef.current = false;
            });
          }}
        >
          <Ionicons name="log-out-outline" size={SIGNOUT_ICON} color={colors.danger} />
          <Text style={[styles.signOutTxt, isAr && styles.signOutTxtAr]}>{i18n.t("signOut")}</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hubSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.1,
    marginBottom: 10,
  },
  hubSectionSpaced: {
    marginTop: 20,
  },
  contentWrap: {
    position: "relative",
    overflow: "visible",
  },
  brandFooterCard: {
    marginTop: 12,
    height: 66,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  brandFooterWordmark: {
    width: 164,
    height: 26,
    opacity: 0.74,
  },
  brandFooterCaption: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 0.15,
  },
  soonBand: {
    borderWidth: 1,
    borderRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: colors.surfaceSubtle,
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  tile: {
    width: "48%",
    minWidth: 148,
    flexGrow: 1,
    minHeight: 108,
  },
  signOut: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(198, 40, 40, 0.35)",
    backgroundColor: colors.surface,
    ...shadowSoft,
  },
  signOutAr: { flexDirection: "row-reverse" },
  signOutPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  signOutTxt: { fontSize: 16, fontWeight: "800", color: colors.danger },
  signOutTxtAr: { textAlign: "right" },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginTop: 22,
    marginBottom: 2,
    marginHorizontal: -20,
  },
});
