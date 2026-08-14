import React from "react";
import { ScrollView, ScrollViewProps, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "./NavIcons";
import { useAppLocale } from "../../i18n/LocaleContext";
import { i18n } from "../../i18n";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { floatingTabBarBottomInset } from "../../theme/shadows";

/**
 * Shared shell for pushed detail screens: an adat header with a single RTL-aware
 * back chevron (44pt touch target) and a scrollable body. Matches the app's header
 * chrome so every detail page looks the same.
 */
export function DetailShell({
  title,
  children,
  scrollable = true,
  refreshControl,
}: {
  title: string;
  children: React.ReactNode;
  scrollable?: boolean;
  refreshControl?: ScrollViewProps["refreshControl"];
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { locale } = useAppLocale();
  const isAr = locale === "ar";

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerCard}>
          <View style={styles.headerGlow} />
          <View style={styles.headerRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={i18n.t("back")}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              style={[styles.backBtn, isAr ? styles.backBtnAr : styles.backBtnEn]}
            >
              <Ionicons name={isAr ? "chevron-forward" : "chevron-back"} size={24} color={colors.ink} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.headerSide} />
          </View>
        </View>
      </View>

      {scrollable ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.background, paddingHorizontal: 16, paddingBottom: 8 },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(13, 138, 78, 0.11)",
    top: -62,
    right: -28,
  },
  headerRow: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  backBtnEn: { marginStart: -8 },
  backBtnAr: { marginEnd: -8 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.2,
  },
  headerSide: { width: 44 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: floatingTabBarBottomInset + spacing.md },
});
