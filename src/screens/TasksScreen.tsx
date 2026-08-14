import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "../components/ui/NavIcons";
import { ScreenShell } from "../components/ui/ScreenShell";
import { PremiumCard } from "../components/ui/PremiumCard";
import { StatusPill, StatusPillTone } from "../components/ui/StatusPill";
import { EmptyPanel } from "../components/ui/EmptyPanel";
import { SkeletonList } from "../components/ui/Skeleton";
import { useAppLocale } from "../i18n/LocaleContext";
import { i18n } from "../i18n";
import { taskService } from "../services/taskService";
import { EmployeeTask } from "../types/api";
import type { RootStackParamList } from "../types/navigation";
import { colors } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { floatingTabBarBottomInset } from "../theme/shadows";
import { formatYyyyMmDdForDisplay } from "../utils/mobileDateFormat";

export function taskStatusTone(status?: string): StatusPillTone {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "success";
  if (s === "in_progress") return "warning";
  if (s === "cancelled") return "neutral";
  return "neutral";
}
export function taskStatusLabel(status?: string): string {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return i18n.t("taskStatusCompleted");
  if (s === "in_progress") return i18n.t("taskStatusInProgress");
  if (s === "cancelled") return i18n.t("taskStatusCancelled");
  return i18n.t("taskStatusOpen");
}
function priorityColor(priority?: string | null): string {
  const p = String(priority || "").toLowerCase();
  if (p === "high" || p === "urgent") return colors.danger;
  if (p === "medium") return colors.warning;
  return colors.textMuted;
}

export function TasksScreen() {
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const align = isAr ? "right" : "left";
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await taskService.listMyTasks());
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  // Refetch when returning to the tab (e.g. after changing a task's status).
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <ScreenShell title={i18n.t("tasksTitle")} subtitle={i18n.t("tasksSubtitle")} headerDensity="compact">
      {loading && tasks.length === 0 ? (
        <SkeletonList count={4} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          scrollEnabled={false}
          contentContainerStyle={{ paddingBottom: floatingTabBarBottomInset + 10 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyPanel title={i18n.t("tasksEmptyTitle")} hint={i18n.t("tasksEmptyHint")}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="checkmark-done-outline" size={26} color={colors.primary} />
                </View>
              </EmptyPanel>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("TaskDetail", { id: item.id })}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <PremiumCard style={styles.card}>
                <View style={[styles.headerRow, isAr && styles.rowReverse]}>
                  <View style={[styles.prioDot, { backgroundColor: priorityColor(item.priority) }]} />
                  <Text style={[styles.title, { textAlign: align }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Ionicons name={isAr ? "chevron-back" : "chevron-forward"} size={16} color={colors.textMuted} />
                </View>
                <View style={[styles.metaRow, isAr && styles.rowReverse]}>
                  <StatusPill label={taskStatusLabel(item.status)} tone={taskStatusTone(item.status)} numberOfLines={1} />
                  {item.due_date ? (
                    <Text style={styles.due}>{`${i18n.t("taskDue")} ${formatYyyyMmDdForDisplay(item.due_date ?? undefined) ?? ""}`}</Text>
                  ) : null}
                </View>
              </PremiumCard>
            </Pressable>
          )}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  rowReverse: { flexDirection: "row-reverse" },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  card: { marginBottom: spacing.md, paddingVertical: spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  prioDot: { width: 10, height: 10, borderRadius: 5 },
  title: { flex: 1, fontSize: 15.5, fontWeight: "800", color: colors.ink, letterSpacing: -0.2, lineHeight: 21 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginTop: spacing.md },
  due: { fontSize: 12, fontWeight: "700", color: colors.textMuted, fontVariant: ["tabular-nums"] },
  emptyWrap: { paddingTop: spacing.xxl },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
});
