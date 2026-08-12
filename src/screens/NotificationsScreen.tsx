import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { PremiumCard } from "../components/ui/PremiumCard";
import { useAppLocale } from "../i18n/LocaleContext";
import { colors } from "../theme/colors";
import { floatingTabBarBottomInset } from "../theme/shadows";
import { getApiErrorMessage } from "../services/http";
import { notificationsService, type AppNotification } from "../services/notificationsService";

export function NotificationsScreen() {
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const align = isAr ? "right" : "left";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await notificationsService.getNotifications();
        if (!active) return;
        setItems(rows);
      } catch (e) {
        if (!active) return;
        setError(getApiErrorMessage(e));
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <ScrollView style={styles.outer} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.successDark} />
        </View>
      ) : error ? (
        <PremiumCard style={styles.card}>
          <Text style={[styles.errTxt, { textAlign: align }]}>{error}</Text>
        </PremiumCard>
      ) : items.length === 0 ? (
        <PremiumCard style={styles.card}>
          <Text style={[styles.emptyTxt, { textAlign: align }]}>
            {isAr ? "لا توجد تنبيهات جديدة." : "No new notifications."}
          </Text>
        </PremiumCard>
      ) : (
        items.map((n) => (
          <PremiumCard key={n.id} style={styles.card}>
            <View style={[styles.row, isAr && styles.rowR]}>
              <View style={styles.dot} />
              <View style={styles.flex1}>
                <Text style={[styles.title, { textAlign: align }]}>{n.title}</Text>
                {n.description ? (
                  <Text style={[styles.desc, { textAlign: align }]}>{n.description}</Text>
                ) : null}
              </View>
            </View>
          </PremiumCard>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: floatingTabBarBottomInset + 10 },
  center: { paddingVertical: 32, alignItems: "center" },
  card: { marginTop: 10 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  rowR: { flexDirection: "row-reverse" },
  flex1: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, marginTop: 6 },
  title: { fontSize: 15, fontWeight: "800", color: colors.ink, lineHeight: 21 },
  desc: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: 3, lineHeight: 19 },
  errTxt: { fontSize: 14, color: colors.danger, fontWeight: "600" },
  emptyTxt: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
});
