import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { DetailShell } from "../components/ui/DetailShell";
import { StatusPill } from "../components/ui/StatusPill";
import { useAppLocale } from "../i18n/LocaleContext";
import { i18n } from "../i18n";
import { taskService } from "../services/taskService";
import { taskStatusLabel, taskStatusTone } from "./TasksScreen";
import { EmployeeTask } from "../types/api";
import type { RootStackParamList } from "../types/navigation";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { shadowSoft } from "../theme/shadows";
import { formatYyyyMmDdForDisplay } from "../utils/mobileDateFormat";
import { hapticSuccess, hapticError } from "../utils/haptics";

function Row({ label, value, isAr }: { label: string; value: string; isAr: boolean }) {
  if (!value) return null;
  return (
    <View style={[styles.row, isAr && styles.rowReverse]}>
      <Text style={[styles.rowLabel, { textAlign: isAr ? "right" : "left" }]}>{label}</Text>
      <Text style={[styles.rowValue, { textAlign: isAr ? "left" : "right" }]}>{value}</Text>
    </View>
  );
}

export function TaskDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "TaskDetail">>();
  const { id } = route.params;
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const align = isAr ? "right" : "left";

  const [task, setTask] = useState<EmployeeTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"in_progress" | "completed" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await taskService.listMyTasks();
      setTask(all.find((t) => t.id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = (status: "in_progress" | "completed") => {
    setSaving(status);
    taskService
      .updateTaskStatus(id, status)
      .then(() => {
        hapticSuccess();
        return load();
      })
      .catch(() => hapticError())
      .finally(() => setSaving(null));
  };

  const status = String(task?.status || "").toLowerCase();
  const canStart = status === "open";
  const canComplete = status === "open" || status === "in_progress";

  return (
    <DetailShell
      title={i18n.t("taskDetailTitle")}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      {loading && !task ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !task ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{i18n.t("requestDetailNotFound")}</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <View style={[styles.headerRow, isAr && styles.rowReverse]}>
              <Text style={[styles.title, { textAlign: align }]} numberOfLines={3}>
                {task.title}
              </Text>
              <StatusPill label={taskStatusLabel(task.status)} tone={taskStatusTone(task.status)} numberOfLines={1} />
            </View>
            {task.description ? (
              <Text style={[styles.desc, { textAlign: align }]}>{task.description}</Text>
            ) : null}
            <Row label={i18n.t("taskDue")} value={formatYyyyMmDdForDisplay(task.due_date) ?? ""} isAr={isAr} />
            <Row label={i18n.t("taskPriority")} value={task.priority ? i18n.t(`taskPriority_${String(task.priority).toLowerCase()}`) : ""} isAr={isAr} />
            {task.assigned_by ? <Row label={i18n.t("taskAssignedBy")} value={String(task.assigned_by)} isAr={isAr} /> : null}
            {task.task_number ? <Row label={i18n.t("requestId")} value={String(task.task_number)} isAr={isAr} /> : null}
          </View>

          {canStart || canComplete ? (
            <View style={styles.actions}>
              {canStart ? (
                <Pressable
                  disabled={saving != null}
                  onPress={() => changeStatus("in_progress")}
                  style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed, saving != null && styles.disabled]}
                >
                  {saving === "in_progress" ? (
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                  ) : (
                    <Text style={styles.btnGhostText}>{i18n.t("taskStart")}</Text>
                  )}
                </Pressable>
              ) : null}
              {canComplete ? (
                <Pressable
                  disabled={saving != null}
                  onPress={() => changeStatus("completed")}
                  style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed, saving != null && styles.disabled]}
                >
                  {saving === "completed" ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.btnPrimaryText}>{i18n.t("taskComplete")}</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </DetailShell>
  );
}

const styles = StyleSheet.create({
  rowReverse: { flexDirection: "row-reverse" },
  center: { paddingVertical: spacing.xxxl, alignItems: "center" },
  muted: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadowSoft,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.sm },
  title: { flex: 1, fontSize: 17, fontWeight: "800", color: colors.ink, letterSpacing: -0.2, lineHeight: 23 },
  desc: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, lineHeight: 21, marginBottom: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  rowLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  rowValue: { flex: 1, fontSize: 14, fontWeight: "800", color: colors.ink },
  actions: { flexDirection: "row", gap: spacing.md },
  btn: { flex: 1, minHeight: 48, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  btnGhost: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border },
  btnGhostText: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
});
