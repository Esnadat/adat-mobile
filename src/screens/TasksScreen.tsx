import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
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
import { managerApprovalsService, type ApprovalItem } from "../services/managerApprovalsService";
import { EmployeeTask } from "../types/api";
import type { RootStackParamList } from "../types/navigation";
import { colors } from "../theme/colors";
import { spacing, radius } from "../theme/spacing";
import { floatingTabBarBottomInset } from "../theme/shadows";
import { formatYyyyMmDdForDisplay } from "../utils/mobileDateFormat";
import { hapticSuccess, hapticError } from "../utils/haptics";

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

  const [mode, setMode] = useState<"mine" | "approvals">("mine");
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

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

  const loadApprovals = useCallback(async () => {
    setApprovalsLoading(true);
    try {
      const { items, isManager: mgr } = await managerApprovalsService.listPending();
      setApprovals(items);
      setIsManager(mgr);
      if (!mgr) setMode("mine");
    } finally {
      setApprovalsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadApprovals();
  }, [load, loadApprovals]);
  // Refetch when returning to the tab (e.g. after changing a task's status or approving).
  useFocusEffect(
    useCallback(() => {
      void load();
      void loadApprovals();
    }, [load, loadApprovals])
  );

  const act = useCallback(
    (item: ApprovalItem, action: "approve" | "reject") => {
      const confirmTitle = action === "approve" ? i18n.t("approvalApproveConfirm") : i18n.t("approvalRejectConfirm");
      Alert.alert(confirmTitle, "", [
        { text: i18n.t("cancel"), style: "cancel" },
        {
          text: action === "approve" ? i18n.t("approvalApprove") : i18n.t("approvalReject"),
          style: action === "approve" ? "default" : "destructive",
          onPress: () => {
            setActingId(item.id);
            const p = action === "approve" ? managerApprovalsService.approve(item) : managerApprovalsService.reject(item);
            p.then(() => {
              hapticSuccess();
              return loadApprovals();
            })
              .catch(() => {
                hapticError();
                Alert.alert(i18n.t("approvalActionError"));
              })
              .finally(() => setActingId(null));
          },
        },
      ]);
    },
    [loadApprovals]
  );

  const approvalTypeLabel = (t: ApprovalItem["type"]): string =>
    t === "leave" ? i18n.t("leave") : t === "permission" ? i18n.t("permission") : i18n.t("cancelLeaveTitle");

  const approvalPeriod = (item: ApprovalItem): string => {
    if (item.type === "permission") {
      const d = formatYyyyMmDdForDisplay(item.permissionDate ?? undefined) ?? "";
      const t = [item.startTime, item.endTime].filter(Boolean).join(" – ");
      return [d, t].filter(Boolean).join(" · ");
    }
    const from = formatYyyyMmDdForDisplay(item.fromDate ?? undefined) ?? "";
    const to = formatYyyyMmDdForDisplay(item.toDate ?? undefined) ?? "";
    return from && to ? `${from} → ${to}` : from || to;
  };

  const segmented = isManager ? (
    <View style={[styles.segmented, isAr && styles.rowReverse]}>
      <Pressable style={[styles.segItem, mode === "mine" && styles.segItemActive]} onPress={() => setMode("mine")}>
        <Text style={[styles.segText, mode === "mine" && styles.segTextActive]}>{i18n.t("myTasksTab")}</Text>
      </Pressable>
      <Pressable style={[styles.segItem, mode === "approvals" && styles.segItemActive]} onPress={() => setMode("approvals")}>
        <View style={[styles.segInner, isAr && styles.rowReverse]}>
          <Text style={[styles.segText, mode === "approvals" && styles.segTextActive]}>{i18n.t("approvalsTab")}</Text>
          {approvals.length > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{approvals.length}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  ) : null;

  if (mode === "approvals") {
    return (
      <ScreenShell title={i18n.t("tasksTitle")} subtitle={i18n.t("tasksSubtitle")} headerDensity="compact">
        {segmented}
        {approvalsLoading && approvals.length === 0 ? (
          <SkeletonList count={3} />
        ) : (
          <FlatList
            data={approvals}
            keyExtractor={(a) => `${a.type}:${a.id}`}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: floatingTabBarBottomInset + 10 }}
            refreshControl={<RefreshControl refreshing={approvalsLoading} onRefresh={() => void loadApprovals()} tintColor={colors.primary} colors={[colors.primary]} />}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <EmptyPanel title={i18n.t("approvalsEmptyTitle")} hint={i18n.t("approvalsEmptyHint")}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="checkmark-done-outline" size={26} color={colors.primary} />
                  </View>
                </EmptyPanel>
              </View>
            }
            renderItem={({ item }) => (
              <PremiumCard style={styles.card}>
                <View style={[styles.headerRow, isAr && styles.rowReverse]}>
                  <Text style={[styles.title, { textAlign: align }]} numberOfLines={1}>
                    {item.employeeName || item.employeeId}
                  </Text>
                  <View style={styles.typeChip}>
                    <Text style={styles.typeChipText}>{approvalTypeLabel(item.type)}</Text>
                  </View>
                </View>
                <Text style={[styles.approvalMeta, { textAlign: align }]} numberOfLines={1}>
                  {approvalPeriod(item)}
                  {item.type !== "permission" && item.leaveType ? ` · ${item.leaveType}` : ""}
                </Text>
                {item.reason ? (
                  <Text style={[styles.approvalReason, { textAlign: align }]} numberOfLines={2}>
                    {item.reason}
                  </Text>
                ) : null}
                <View style={[styles.actions, isAr && styles.rowReverse]}>
                  <Pressable
                    disabled={actingId === item.id}
                    onPress={() => act(item, "reject")}
                    style={({ pressed }) => [styles.btn, styles.rejectBtn, pressed && styles.pressed, actingId === item.id && styles.btnDisabled]}
                  >
                    <Text style={styles.rejectText}>{i18n.t("approvalReject")}</Text>
                  </Pressable>
                  <Pressable
                    disabled={actingId === item.id}
                    onPress={() => act(item, "approve")}
                    style={({ pressed }) => [styles.btn, styles.approveBtn, pressed && styles.pressed, actingId === item.id && styles.btnDisabled]}
                  >
                    {actingId === item.id ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.approveText}>{i18n.t("approvalApprove")}</Text>
                    )}
                  </Pressable>
                </View>
              </PremiumCard>
            )}
          />
        )}
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={i18n.t("tasksTitle")} subtitle={i18n.t("tasksSubtitle")} headerDensity="compact">
      {segmented}
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
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: "center" },
  segItemActive: { backgroundColor: colors.primary },
  segInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  segText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  segTextActive: { color: colors.white },
  badge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { fontSize: 11, fontWeight: "800", color: colors.white },
  typeChip: { backgroundColor: colors.surfaceSubtle, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
  typeChipText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
  approvalMeta: { fontSize: 12.5, fontWeight: "600", color: colors.textMuted, marginTop: 6 },
  approvalReason: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 19 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  approveBtn: { backgroundColor: colors.primary },
  rejectBtn: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.danger },
  approveText: { fontSize: 14, fontWeight: "800", color: colors.white },
  rejectText: { fontSize: 14, fontWeight: "800", color: colors.danger },
  btnDisabled: { opacity: 0.6 },
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
