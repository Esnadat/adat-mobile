import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { useAppLocale } from "../../i18n/LocaleContext";
import { i18n } from "../../i18n";
import { colors } from "../../theme/colors";

/**
 * Thin banner shown when the device loses connectivity. NetInfo auto-reconnects and
 * the banner clears itself when the connection returns — no manual retry needed.
 * Rendered at the app root above the navigator so it overlays any screen.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { locale } = useAppLocale();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Treat unknown as online to avoid false positives on some Android devices.
      const connected = state.isConnected !== false && state.isInternetReachable !== false;
      setOffline(!connected);
    });
    return () => unsubscribe();
  }, []);

  if (!offline) return null;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]} pointerEvents="none">
      <View style={styles.pill}>
        <View style={styles.dot} />
        <Text style={styles.text} numberOfLines={1}>
          {locale === "ar" ? "لا يوجد اتصال بالإنترنت — تتم إعادة المحاولة تلقائياً" : i18n.t("offlineBanner")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 6,
    paddingHorizontal: 16,
    zIndex: 1000,
    elevation: 1000,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: "100%",
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning },
  text: { color: colors.white, fontSize: 12.5, fontWeight: "700", flexShrink: 1 },
});
