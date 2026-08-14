import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { DetailShell } from "../components/ui/DetailShell";
import { Ionicons } from "../components/ui/NavIcons";
import { SkeletonList } from "../components/ui/Skeleton";
import { useAppLocale } from "../i18n/LocaleContext";
import { i18n } from "../i18n";
import { notificationsService, type AppNotification } from "../services/notificationsService";
import { applyReadState, markAllRead, markRead } from "../utils/notificationReads";
import type { RootStackParamList, TabId } from "../types/navigation";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { shadowSoft } from "../theme/shadows";

/** Maps a notification href to a bottom tab (destinations are sections, not items). */
function hrefToTab(href: string | null): TabId | null {
  const h = String(href || "").toLowerCase();
  if (h.startsWith("/requests")) return "requests";
  if (h.startsWith("/attendance")) return "attendance";
  if (h.startsWith("/calendar")) return "calendar";
  if (h.startsWith("/tasks")) return "tasks";
  if (h.startsWith("/profile") || h.startsWith("/hr") || h.startsWith("/more")) return "more";
  return null;
}

function typeIcon(type: string): React.ComponentProps<typeof Ionicons>["name"] {
  switch (type) {
    case "request":
      return "document-text-outline";
    case "attendance":
      return "time-outline";
    case "document":
      return "folder-open-outline";
    case "hr":
      return "briefcase-outline";
    default:
      return "notifications-outline";
  }
}

export function NotificationsScreen() {
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const align = isAr ? "right" : "left";
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await notificationsService.getNotifications();
      setItems(await applyReadState(rows));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onOpen = (n: AppNotification) => {
    void markRead(n.id);
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    const tab = hrefToTab(n.href);
    if (tab) navigation.navigate("Main", { tab });
  };

  const onMarkAll = () => {
    void markAllRead(items.map((x) => x.id));
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
  };

  const hasUnread = items.some((x) => !x.read);

  return (
    <DetailShell
      title={i18n.t("notifTitle")}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      {hasUnread ? (
        <View style={[styles.toolbar, isAr && styles.rowReverse]}>
          <Pressable onPress={onMarkAll} hitSlop={8} style={({ pressed }) => [styles.markAll, pressed && styles.pressed]}>
            <Ionicons name="checkmark-done-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.markAllText}>{i18n.t("notifMarkAll")}</Text>
          </Pressable>
        </View>
      ) : null}

      {loading && items.length === 0 ? (
        <SkeletonList count={4} />
      ) : items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="notifications-off-outline" size={26} color={colors.textMuted} />
          <Text style={styles.emptyText}>{i18n.t("notifEmpty")}</Text>
        </View>
      ) : (
        items.map((n) => {
          const tappable = hrefToTab(n.href) != null;
          return (
            <Pressable
              key={n.id}
              accessibilityRole={tappable ? "button" : undefined}
              onPress={() => onOpen(n)}
              style={({ pressed }) => [styles.card, !n.read && styles.cardUnread, pressed && tappable && styles.pressed]}
            >
              <View style={[styles.row, isAr && styles.rowReverse]}>
                <View style={[styles.iconWrap, !n.read && styles.iconWrapUnread]}>
                  <Ionicons name={typeIcon(n.type)} size={18} color={n.read ? colors.textMuted : colors.primaryDark} />
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.title, { textAlign: align }, !n.read && styles.titleUnread]} numberOfLines={2}>
                    {n.title}
                  </Text>
                  {n.description ? (
                    <Text style={[styles.desc, { textAlign: align }]} numberOfLines={3}>
                      {n.description}
                    </Text>
                  ) : null}
                </View>
                {!n.read ? <View style={styles.unreadDot} /> : null}
                {tappable ? <Ionicons name={isAr ? "chevron-back" : "chevron-forward"} size={15} color={colors.textMuted} /> : null}
              </View>
            </Pressable>
          );
        })
      )}
    </DetailShell>
  );
}

const styles = StyleSheet.create({
  rowReverse: { flexDirection: "row-reverse" },
  pressed: { opacity: 0.85 },
  toolbar: { flexDirection: "row", justifyContent: "flex-end", marginBottom: spacing.md },
  markAll: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 8 },
  markAllText: { fontSize: 13, fontWeight: "800", color: colors.primaryDark },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadowSoft,
  },
  cardUnread: { borderColor: colors.primaryLight, backgroundColor: "#FCFEFC" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapUnread: { backgroundColor: colors.primaryLight },
  flex1: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: "700", color: colors.ink, lineHeight: 21 },
  titleUnread: { fontWeight: "800" },
  desc: { fontSize: 13, fontWeight: "600", color: colors.textMuted, lineHeight: 19 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  emptyBox: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxxl },
  emptyText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
});
