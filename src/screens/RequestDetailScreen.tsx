import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { DetailShell } from "../components/ui/DetailShell";
import { StatusPill, StatusPillTone } from "../components/ui/StatusPill";
import { useAppLocale } from "../i18n/LocaleContext";
import { i18n } from "../i18n";
import { requestService } from "../services/requestService";
import { attachmentService, AttachmentPolicy, RequestAttachment } from "../services/attachmentService";
import { AdatAlert, AdatAlertConfig } from "../components/ui/AdatAlert";
import { RequestTimeline } from "../components/requests/RequestTimeline";
import { Ionicons } from "../components/ui/NavIcons";
import { EmployeeRequest, RequestStatus, RequestType } from "../types/api";
import { RootStackParamList } from "../types/navigation";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { shadowSoft } from "../theme/shadows";
import { formatYyyyMmDdForDisplay, formatMobileTimeString } from "../utils/mobileDateFormat";
import { localizeLeaveTypeLabel } from "../utils/leaveTypeLabel";
import { hapticSuccess, hapticError } from "../utils/haptics";

function statusTone(s: RequestStatus): StatusPillTone {
  if (s === "approved") return "success";
  if (s === "rejected") return "danger";
  if (s === "cancelled") return "neutral";
  return "warning";
}
function statusLabel(s: RequestStatus): string {
  if (s === "approved") return i18n.t("requestStatusApproved");
  if (s === "rejected") return i18n.t("requestStatusRejected");
  if (s === "cancelled") return i18n.t("requestStatusCancelled");
  return i18n.t("requestStatusPending");
}
function typeLabel(t: RequestType | string): string {
  const map: Record<string, string> = {
    leave: i18n.t("requestTypeLeave"),
    permission: i18n.t("requestTypePermission"),
    support: i18n.t("support"),
  };
  return map[String(t)] ?? String(t);
}

function Row({ label, value, isAr }: { label: string; value: string; isAr: boolean }) {
  if (!value) return null;
  return (
    <View style={[styles.row, isAr && styles.rowReverse]}>
      <Text style={[styles.rowLabel, { textAlign: isAr ? "right" : "left" }]}>{label}</Text>
      <Text style={[styles.rowValue, { textAlign: isAr ? "left" : "right" }]}>{value}</Text>
    </View>
  );
}

export function RequestDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "RequestDetail">>();
  const navigation = useNavigation();
  const { id, type } = route.params;
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const align = isAr ? "right" : "left";

  const [item, setItem] = useState<EmployeeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [policy, setPolicy] = useState<AttachmentPolicy | null>(null);
  const [attachments, setAttachments] = useState<RequestAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AdatAlertConfig | null>(null);

  const attachKind = type === "leave" || type === "permission" ? type : null;

  const loadAttachments = useCallback(async () => {
    if (!attachKind) return;
    const [pol, list] = await Promise.all([
      attachmentService.getPolicy(attachKind),
      attachmentService.list(attachKind, id),
    ]);
    setPolicy(pol);
    setAttachments(list);
  }, [attachKind, id]);

  useEffect(() => {
    void loadAttachments();
  }, [loadAttachments]);

  const onAddAttachment = async () => {
    if (!attachKind || !policy) return;
    if (attachments.length >= policy.maxFiles) {
      setAlertConfig({ tone: "info", title: i18n.t("error"), message: i18n.t("attachMaxFiles") });
      return;
    }
    try {
      const file = await attachmentService.pickDocument();
      if (!file) return;
      if (file.size > policy.maxSizeBytes) {
        setAlertConfig({ tone: "danger", title: i18n.t("error"), message: i18n.t("attachTooLarge") });
        return;
      }
      if (policy.allowedMimeTypes.length && !policy.allowedMimeTypes.includes(file.mimeType)) {
        setAlertConfig({ tone: "danger", title: i18n.t("error"), message: i18n.t("attachBadType") });
        return;
      }
      setUploading(true);
      await attachmentService.upload(attachKind, id, file);
      await loadAttachments();
    } catch {
      setAlertConfig({ tone: "danger", title: i18n.t("error"), message: i18n.t("attachUploadFailed") });
    } finally {
      setUploading(false);
    }
  };

  const onRemoveAttachment = (attId: string) => {
    attachmentService
      .remove(attId)
      .then(() => loadAttachments())
      .catch(() => setAlertConfig({ tone: "danger", title: i18n.t("error"), message: i18n.t("attachUploadFailed") }));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, tickets] = await Promise.all([
        requestService.getMyRequests().catch(() => [] as EmployeeRequest[]),
        requestService.getMySupportTickets().catch(() => [] as EmployeeRequest[]),
      ]);
      const found = [...reqs, ...tickets].find((r) => r.id === id) ?? null;
      setItem(found);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onCancel = () => {
    if (!item) return;
    Alert.alert(i18n.t("cancelRequestConfirmTitle"), i18n.t("cancelRequestConfirmBody"), [
      { text: i18n.t("cancelRequestConfirmNo"), style: "cancel" },
      {
        text: i18n.t("cancelRequestConfirmYes"),
        style: "destructive",
        onPress: () => {
          setCancelling(true);
          requestService
            .cancelRequest(item.id, item.type)
            .then(() => {
              hapticSuccess();
              navigation.goBack();
            })
            .catch(() => {
              hapticError();
              Alert.alert(i18n.t("cancelRequestError"));
            })
            .finally(() => setCancelling(false));
        },
      },
    ]);
  };

  const canCancel = item?.status === "pending" && (item.type === "leave" || item.type === "permission");

  return (
    <DetailShell
      title={i18n.t("requestDetailTitle")}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      {loading && !item ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !item ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{i18n.t("requestDetailNotFound")}</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <View style={[styles.headerRow, isAr && styles.rowReverse]}>
              <Text style={[styles.typeText, { textAlign: align }]}>{typeLabel(item.type)}</Text>
              <StatusPill label={statusLabel(item.status)} tone={statusTone(item.status)} numberOfLines={1} />
            </View>

            {item.type === "leave" ? (
              <>
                <Row label={i18n.t("leaveType")} value={localizeLeaveTypeLabel(String((item as { leaveType?: string }).leaveType ?? ""), locale)} isAr={isAr} />
                <Row label={i18n.t("requestFrom")} value={formatYyyyMmDdForDisplay(item.fromDate) ?? ""} isAr={isAr} />
                <Row label={i18n.t("requestTo")} value={formatYyyyMmDdForDisplay(item.toDate) ?? ""} isAr={isAr} />
              </>
            ) : null}
            {item.type === "permission" ? (
              <>
                <Row label={i18n.t("calendarDateLabel")} value={formatYyyyMmDdForDisplay(item.permissionDate) ?? ""} isAr={isAr} />
                <Row
                  label={i18n.t("dayDetailShiftTime")}
                  value={
                    item.startTime || item.endTime
                      ? `${formatMobileTimeString(item.startTime, locale)} – ${formatMobileTimeString(item.endTime, locale)}`
                      : ""
                  }
                  isAr={isAr}
                />
              </>
            ) : null}
            {item.type === "support" ? (
              <>
                <Row label={i18n.t("requestSubject")} value={String(item.subject ?? "")} isAr={isAr} />
                <Row label={i18n.t("requestCategory")} value={String(item.category ?? "")} isAr={isAr} />
              </>
            ) : null}

            {item.reason ? (
              <View style={styles.reasonBlock}>
                <Text style={[styles.rowLabel, { textAlign: align }]}>{i18n.t("requestReason")}</Text>
                <Text style={[styles.reasonText, { textAlign: align }]}>{item.reason}</Text>
              </View>
            ) : null}

            <Row label={i18n.t("requestId")} value={item.id} isAr={isAr} />
          </View>

          {item.type === "leave" || item.type === "permission" ? (
            <View style={styles.card}>
              <RequestTimeline item={item} isAr={isAr} />
            </View>
          ) : null}

          {attachKind && policy && policy.mode !== "hidden" ? (
            <View style={styles.card}>
              <View style={[styles.headerRow, isAr && styles.rowReverse]}>
                <Text style={[styles.typeText, { fontSize: 15, textAlign: align }]}>{i18n.t("attachTitle")}</Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={uploading || attachments.length >= policy.maxFiles}
                  onPress={() => void onAddAttachment()}
                  style={({ pressed }) => [styles.addBtn, pressed && styles.pressed, (uploading || attachments.length >= policy.maxFiles) && styles.disabled]}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                  ) : (
                    <>
                      <Ionicons name="add" size={16} color={colors.primaryDark} />
                      <Text style={styles.addBtnText}>{i18n.t("attachAdd")}</Text>
                    </>
                  )}
                </Pressable>
              </View>
              <Text style={[styles.attachHint, { textAlign: align }]}>
                {`${i18n.t("attachHint")} · ${i18n.t("attachTypes")} · ${Math.round(policy.maxSizeBytes / (1024 * 1024))}MB · ${attachments.length}/${policy.maxFiles}`}
              </Text>
              {attachments.length === 0 ? (
                <Text style={[styles.attachEmpty, { textAlign: align }]}>{i18n.t("attachNone")}</Text>
              ) : (
                attachments.map((a, i) => (
                  <View key={a.id} style={[styles.attachRow, isAr && styles.rowReverse, i > 0 && styles.attachDivider]}>
                    <Ionicons name="document-attach-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.attachName, { textAlign: align }]} numberOfLines={1}>
                      {a.file_name}
                    </Text>
                    <Text style={styles.attachSize}>{`${Math.max(1, Math.round(a.size_bytes / 1024))}KB`}</Text>
                    {canCancel ? (
                      <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onRemoveAttachment(a.id)} style={({ pressed }) => pressed && styles.pressed}>
                        <Ionicons name="trash-outline" size={17} color={colors.danger} />
                      </Pressable>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          ) : null}

          <Text style={[styles.note, { textAlign: align }]}>{i18n.t("requestDetailApprovalNote")}</Text>

          {canCancel ? (
            <Pressable
              disabled={cancelling}
              onPress={onCancel}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed, cancelling && styles.disabled]}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Text style={styles.cancelText}>{i18n.t("cancelRequest")}</Text>
              )}
            </Pressable>
          ) : null}
        </>
      )}
      <AdatAlert config={alertConfig} onClose={() => setAlertConfig(null)} />
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
    marginBottom: spacing.md,
    ...shadowSoft,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.sm },
  typeText: { flex: 1, fontSize: 17, fontWeight: "800", color: colors.ink, letterSpacing: -0.2 },
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
  reasonBlock: { paddingTop: 10, gap: 5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  reasonText: { fontSize: 14, fontWeight: "600", color: colors.ink, lineHeight: 21 },
  note: { fontSize: 12, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 18 },
  cancelBtn: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  cancelText: { fontSize: 15, fontWeight: "800", color: colors.danger },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primaryLight, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, minHeight: 34 },
  addBtnText: { fontSize: 13, fontWeight: "800", color: colors.primaryDark },
  attachHint: { fontSize: 11.5, fontWeight: "600", color: colors.textMuted, marginTop: 8, marginBottom: 4, fontVariant: ["tabular-nums"] },
  attachEmpty: { fontSize: 13, fontWeight: "600", color: colors.textMuted, paddingVertical: 8 },
  attachRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 10 },
  attachDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  attachName: { flex: 1, fontSize: 13.5, fontWeight: "700", color: colors.ink },
  attachSize: { fontSize: 11.5, fontWeight: "700", color: colors.textMuted, fontVariant: ["tabular-nums"] },
});
