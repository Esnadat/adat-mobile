import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PremiumCard } from "../ui/PremiumCard";
import { StatusPill, type StatusPillTone } from "../ui/StatusPill";
import { i18n } from "../../i18n";
import { colors } from "../../theme/colors";
import type { LeaveCancellationRequest, LeaveCancellationStatus } from "../../services/leaveCancellationService";
import { formatYyyyMmDdForDisplay } from "../../utils/mobileDateFormat";

function statusLabel(s: LeaveCancellationStatus): string {
  if (s === "pending_manager") return i18n.t("cancelLeaveStatusPendingManager");
  if (s === "pending_hr") return i18n.t("cancelLeaveStatusPendingHr");
  if (s === "approved") return i18n.t("cancelLeaveStatusApproved");
  if (s === "rejected") return i18n.t("cancelLeaveStatusRejected");
  return i18n.t("cancelLeaveStatusCancelFailed");
}
function statusTone(s: LeaveCancellationStatus): StatusPillTone {
  if (s === "approved") return "success";
  if (s === "rejected") return "danger";
  if (s === "cancel_failed") return "warning";
  return "warning";
}

type StepState = "done" | "current" | "pending";

function dateOnly(v?: string | null): string {
  if (!v) return "";
  return formatYyyyMmDdForDisplay(String(v).split(/[ T]/)[0]) ?? "";
}

/** Compact vertical timeline built strictly from the request's real timestamps. */
export function LeaveCancellationCard({ item, isAr }: { item: LeaveCancellationRequest; isAr: boolean }) {
  const align = isAr ? "right" : "left";
  const rejected = item.status === "rejected";

  const submittedState: StepState = "done";
  const managerState: StepState = item.status === "pending_manager" ? "current" : "done";
  const hrState: StepState =
    item.status === "approved"
      ? "done"
      : item.status === "pending_hr" || item.status === "cancel_failed"
      ? "current"
      : item.status === "pending_manager"
      ? "pending"
      : "done"; // rejected: stage reached a terminal decision

  const steps: { key: string; title: string; date: string; state: StepState; danger?: boolean }[] = [
    { key: "submitted", title: i18n.t("timelineSubmitted"), date: dateOnly(item.createdAt), state: submittedState },
    { key: "manager", title: i18n.t("cancelLeaveStageManager"), date: dateOnly(item.managerAt), state: managerState },
    rejected
      ? { key: "result", title: i18n.t("cancelLeaveStatusRejected"), date: dateOnly(item.rejectedAt), state: "done", danger: true }
      : { key: "hr", title: i18n.t("cancelLeaveStageHr"), date: dateOnly(item.hrAt), state: hrState },
  ];

  return (
    <PremiumCard style={styles.card}>
      <View style={[styles.header, isAr && styles.rowReverse]}>
        <Text style={[styles.title, { textAlign: align }]} numberOfLines={1}>
          {i18n.t("cancelLeaveTitle")}
        </Text>
        <StatusPill label={statusLabel(item.status)} tone={statusTone(item.status)} numberOfLines={1} />
      </View>
      <Text style={[styles.meta, { textAlign: align }]} numberOfLines={1}>
        {`${item.leaveApplication} · ${item.fromDate} → ${item.toDate}`}
      </Text>

      <View style={styles.timeline}>
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const color =
            step.state === "pending" ? colors.border : step.danger ? colors.danger : step.state === "current" ? colors.primary : colors.success;
          return (
            <View key={step.key} style={[styles.stepRow, isAr && styles.rowReverse]}>
              <View style={styles.rail}>
                <View style={[styles.dot, { borderColor: color }, step.state === "pending" ? styles.dotHollow : { backgroundColor: color }]} />
                {!isLast ? <View style={[styles.line, { backgroundColor: step.state === "done" ? colors.success : colors.border }]} /> : null}
              </View>
              <View style={[styles.stepContent, isLast && styles.stepContentLast]}>
                <Text style={[styles.stepTitle, step.state === "pending" && styles.stepMuted, { textAlign: align }]}>{step.title}</Text>
                {step.date ? <Text style={[styles.stepDate, { textAlign: align }]}>{step.date}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
    </PremiumCard>
  );
}

const DOT = 14;
const styles = StyleSheet.create({
  card: { marginBottom: 10, padding: 14, borderStartWidth: 3, borderStartColor: colors.primary },
  rowReverse: { flexDirection: "row-reverse" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 },
  title: { flex: 1, fontSize: 15, fontWeight: "800", color: colors.ink },
  meta: { fontSize: 12, color: colors.textMuted, fontWeight: "600", marginBottom: 12 },
  timeline: {},
  stepRow: { flexDirection: "row", gap: 10 },
  rail: { alignItems: "center", width: DOT },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2 },
  dotHollow: { backgroundColor: colors.surface },
  line: { width: 2, flex: 1, marginVertical: 2, minHeight: 16 },
  stepContent: { flex: 1, paddingBottom: 14 },
  stepContentLast: { paddingBottom: 0 },
  stepTitle: { fontSize: 13, fontWeight: "700", color: colors.ink },
  stepMuted: { color: colors.textMuted, fontWeight: "600" },
  stepDate: { fontSize: 11, fontWeight: "600", color: colors.textMuted, marginTop: 2 },
});
