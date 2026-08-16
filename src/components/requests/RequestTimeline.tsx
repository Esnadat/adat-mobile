import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { i18n } from "../../i18n";
import { colors } from "../../theme/colors";
import type { EmployeeRequest } from "../../types/api";
import { formatYyyyMmDdForDisplay } from "../../utils/mobileDateFormat";

type StepState = "done" | "current" | "pending";
type StepTone = "default" | "success" | "danger" | "neutral";

interface TimelineStep {
  key: string;
  title: string;
  subtitle?: string;
  date?: string;
  state: StepState;
  tone: StepTone;
}

/** Extracts the date portion (yyyy-mm-dd) from a Frappe timestamp and localizes it. */
function displayDate(value?: string): string {
  if (!value) return "";
  const datePart = String(value).split(/[ T]/)[0];
  return formatYyyyMmDdForDisplay(datePart) ?? "";
}

/**
 * Builds a request timeline strictly from real data returned by the BFF:
 * created_at (submitted), approver / leave_approver (review), status +
 * modified (decision). No stage is invented — steps only appear when the
 * underlying data exists.
 */
function buildSteps(item: EmployeeRequest): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const status = item.status;

  steps.push({
    key: "submitted",
    title: i18n.t("timelineSubmitted"),
    date: displayDate(item.createdAt),
    state: "done",
    tone: "default",
  });

  const hasApprover = Boolean(item.approver);
  if (hasApprover || status === "pending") {
    steps.push({
      key: "review",
      title: i18n.t("timelineReview"),
      subtitle: item.approver || undefined,
      state: status === "pending" ? "current" : "done",
      tone: "default",
    });
  }

  if (status === "approved") {
    steps.push({ key: "decision", title: i18n.t("timelineApproved"), date: displayDate(item.modifiedAt), state: "done", tone: "success" });
  } else if (status === "rejected") {
    steps.push({ key: "decision", title: i18n.t("timelineRejected"), date: displayDate(item.modifiedAt), state: "done", tone: "danger" });
  } else if (status === "cancelled") {
    steps.push({ key: "decision", title: i18n.t("timelineCancelled"), date: displayDate(item.modifiedAt), state: "done", tone: "neutral" });
  } else {
    steps.push({ key: "decision", title: i18n.t("timelinePendingDecision"), state: "pending", tone: "default" });
  }

  return steps;
}

function dotColor(step: TimelineStep): string {
  if (step.state === "pending") return colors.border;
  if (step.tone === "success") return colors.success;
  if (step.tone === "danger") return colors.danger;
  if (step.tone === "neutral") return colors.textMuted;
  return colors.primary;
}

export function RequestTimeline({ item, isAr = false }: { item: EmployeeRequest; isAr?: boolean }) {
  const steps = buildSteps(item);
  const align = isAr ? "right" : "left";

  return (
    <View>
      <Text style={[styles.title, { textAlign: align }]}>{i18n.t("timelineTitle")}</Text>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const color = dotColor(step);
        const lineActive = step.state === "done";
        return (
          <View key={step.key} style={[styles.stepRow, isAr && styles.rowReverse]}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  { borderColor: color },
                  step.state === "pending" ? styles.dotHollow : { backgroundColor: color },
                ]}
              >
                {step.state === "current" ? <View style={styles.dotInner} /> : null}
              </View>
              {!isLast ? (
                <View style={[styles.line, { backgroundColor: lineActive ? colors.primary : colors.border }]} />
              ) : null}
            </View>
            <View style={[styles.content, isLast && styles.contentLast]}>
              <Text style={[styles.stepTitle, step.state === "pending" && styles.stepTitleMuted, { textAlign: align }]}>
                {step.title}
              </Text>
              {step.subtitle ? (
                <Text style={[styles.stepSub, { textAlign: align }]} numberOfLines={1}>
                  {`${i18n.t("timelineApproverLabel")}: ${step.subtitle}`}
                </Text>
              ) : null}
              {step.date ? <Text style={[styles.stepDate, { textAlign: align }]}>{step.date}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 16;

const styles = StyleSheet.create({
  rowReverse: { flexDirection: "row-reverse" },
  title: { fontSize: 15, fontWeight: "800", color: colors.ink, marginBottom: 12 },
  stepRow: { flexDirection: "row", gap: 12 },
  rail: { alignItems: "center", width: DOT },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  dotHollow: { backgroundColor: colors.surface },
  dotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.surface },
  line: { width: 2, flex: 1, marginVertical: 2, minHeight: 20 },
  content: { flex: 1, paddingBottom: 18 },
  contentLast: { paddingBottom: 0 },
  stepTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  stepTitleMuted: { color: colors.textMuted, fontWeight: "600" },
  stepSub: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginTop: 3 },
  stepDate: { fontSize: 12, fontWeight: "600", color: colors.textMuted, marginTop: 3 },
});
