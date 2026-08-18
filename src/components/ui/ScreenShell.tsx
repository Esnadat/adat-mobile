import React from "react";
import { Pressable, ScrollView, ScrollViewProps, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "./NavIcons";
import { useDrawer } from "../../context/DrawerContext";
import { useAppLocale } from "../../i18n/LocaleContext";
import { colors } from "../../theme/colors";
import { floatingTabBarBottomInset } from "../../theme/shadows";
import { type as typeStyles } from "../../theme/typography";

type Props = {
  title: string;
  subtitle?: string;
  headerContent?: React.ReactNode;
  /** Hide shell header entirely (for custom in-content identity strips). */
  hideHeader?: boolean;
  /** Tighter header chrome for operational surfaces (e.g. Home). */
  headerDensity?: "default" | "compact";
  /** Wrap children in a ScrollView (default: true). Pass false for screens that manage their own scroll. */
  scrollable?: boolean;
  /** Merged on top of the default content style. Override specific values only. */
  contentContainerStyle?: ViewStyle;
  /** Passed to the inner ScrollView for pull-to-refresh. */
  refreshControl?: ScrollViewProps["refreshControl"];
  children: React.ReactNode;
};

export function ScreenShell({
  title,
  subtitle,
  headerContent,
  hideHeader = false,
  headerDensity = "compact",
  scrollable = true,
  contentContainerStyle,
  refreshControl,
  children,
}: Props) {
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const textAlign = isAr ? "right" : "left";
  const compact = headerDensity === "compact";
  const drawer = useDrawer();

  return (
    <View style={styles.root}>
      {!hideHeader ? (
        <View style={styles.headerOuter}>
          <View style={[styles.headerCard, compact && styles.headerCardCompact]}>
            <View style={styles.headerGlow} />
            <View style={styles.headerGlowDeep} />
            <View style={[styles.titleRow, isAr && styles.titleRowAr]}>
              {drawer ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={drawer.openDrawer}
                  hitSlop={10}
                  style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons name="menu" size={22} color={colors.ink} />
                </Pressable>
              ) : null}
              <View style={styles.titleTextWrap}>
                <Text style={[compact ? styles.titleCompact : styles.title, { textAlign }]}>{title}</Text>
                {subtitle ? (
                  <Text style={[compact ? styles.subtitleCompact : styles.subtitle, { textAlign }]}>{subtitle}</Text>
                ) : null}
              </View>
            </View>
            {headerContent ? (
              <View style={[styles.headerExtra, compact && styles.headerExtraCompact]}>{headerContent}</View>
            ) : null}
          </View>
        </View>
      ) : null}
      {scrollable ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentContainerStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerOuter: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 15,
    overflow: "hidden",
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 5,
  },
  headerCardCompact: {
    paddingTop: 14,
    paddingBottom: 14,
  },
  headerGlow: {
    position: "absolute",
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: "#CFF4DE",
    top: -74,
    left: -48,
    zIndex: 0,
  },
  headerGlowDeep: {
    position: "absolute",
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: "rgba(16, 177, 74, 0.28)",
    top: -52,
    left: -26,
    zIndex: 0,
  },
  title: {
    ...typeStyles.screenTitle,
    color: colors.ink,
    letterSpacing: -0.35,
    position: "relative",
    zIndex: 1,
  },
  titleCompact: {
    ...typeStyles.screenTitleCompact,
    color: colors.ink,
    position: "relative",
    zIndex: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
    position: "relative",
    zIndex: 1,
  },
  subtitleCompact: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
    position: "relative",
    zIndex: 1,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, position: "relative", zIndex: 1 },
  titleRowAr: { flexDirection: "row-reverse" },
  titleTextWrap: { flex: 1 },
  menuBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border },
  headerExtra: { marginTop: 12, position: "relative", zIndex: 1 },
  headerExtraCompact: { marginTop: 9 },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: floatingTabBarBottomInset + 12,
    flexGrow: 1,
  },
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
