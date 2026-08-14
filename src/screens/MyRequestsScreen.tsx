import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "../components/ui/NavIcons";
import { EmptyPanel } from "../components/ui/EmptyPanel";
import { PremiumCard } from "../components/ui/PremiumCard";
import { StatusPill } from "../components/ui/StatusPill";
import type { StatusPillTone } from "../components/ui/StatusPill";
import type { RootStackParamList } from "../types/navigation";
import { i18n } from "../i18n";
import { useAppLocale } from "../i18n/LocaleContext";
import { requestService } from "../services/requestService";
import { EmployeeRequest, RequestStatus, RequestType } from "../types/api";
import { colors } from "../theme/colors";
import { floatingTabBarBottomInset } from "../theme/shadows";
import { type as typeStyles } from "../theme/typography";
import { formatIsoDateForDisplay, formatMobileTimeString, formatYyyyMmDdForDisplay } from "../utils/mobileDateFormat";
import { SkeletonList } from "../components/ui/Skeleton";

type RequestsFilter = "all" | "pending" | "approved" | "rejected" | "support";

function statusTone(status: RequestStatus): StatusPillTone {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  if (status === "cancelled") return "neutral";
  return "warning";
}

function statusLabel(status: RequestStatus): string {
  if (status === "approved") return i18n.t("requestStatusApproved");
  if (status === "rejected") return i18n.t("requestStatusRejected");
  if (status === "cancelled") return i18n.t("requestStatusCancelled");
  return i18n.t("requestStatusPending");
}

/** Side-accent color reflects the request STATUS (not its type). */
function statusAccentColor(status: RequestStatus): string {
  if (status === "approved") return colors.success;
  if (status === "rejected") return colors.danger;
  if (status === "cancelled") return colors.textMuted;
  return colors.warning;
}

function TypeChip({ type }: { type: RequestType | string }) {
  const t = type as RequestType;
  if (t === "support") {
    return (
      <View style={[styles.typeChip, styles.typeSupport]}>
        <Text style={[styles.typeChipText, styles.typeSupportText]}>{i18n.t("support")}</Text>
      </View>
    );
  }
  if (t === "missed_punch") {
    return (
      <View style={[styles.typeChip, styles.typeMissedPunch]}>
        <Text style={[styles.typeChipText, styles.typeMissedPunchText]}>{i18n.t("requestLabelMissedPunch")}</Text>
      </View>
    );
  }
  if (t === "attendance_adjustment") {
    return (
      <View style={[styles.typeChip, styles.typeAttendanceAdj]}>
        <Text style={[styles.typeChipText, styles.typeAttendanceAdjText]}>{i18n.t("requestLabelAttendanceAdj")}</Text>
      </View>
    );
  }
  if (t === "overtime") {
    return (
      <View style={[styles.typeChip, styles.typeOvertime]}>
        <Text style={[styles.typeChipText, styles.typeOvertimeText]}>{i18n.t("requestLabelOvertime")}</Text>
      </View>
    );
  }
  if (t === "device_change") {
    return (
      <View style={[styles.typeChip, styles.typeDeviceChange]}>
        <Text style={[styles.typeChipText, styles.typeDeviceChangeText]}>{i18n.t("requestTypeDeviceChange")}</Text>
      </View>
    );
  }
  const isLeave = t === "leave";
  return (
    <View style={[styles.typeChip, isLeave ? styles.typeLeave : styles.typePermission]}>
      <Text style={[styles.typeChipText, isLeave ? styles.typeLeaveText : styles.typePermissionText]}>
        {isLeave ? i18n.t("leave") : i18n.t("permission")}
      </Text>
    </View>
  );
}

function supportCategoryLabel(code: string): string {
  const c = code.toLowerCase().trim();
  const map: Record<string, string> = {
    technical: "supportCatTech",
    tech: "supportCatTech",
    hr: "supportCatHR",
    payroll: "supportCatPayroll",
    attendance: "supportCatAttendance",
    other: "supportCatOther",
  };
  const key = map[c];
  return key ? i18n.t(key) : code || i18n.t("notAvailable");
}

function supportPriorityLabel(p: string): string {
  const x = p.toLowerCase().trim();
  if (x === "low") return i18n.t("supportPriLow");
  if (x === "medium") return i18n.t("supportPriMed");
  if (x === "high") return i18n.t("supportPriHigh");
  return p || i18n.t("notAvailable");
}

function buildDateLabel(item: EmployeeRequest, locale?: string): string | null {
  if (item.type === "support") {
    const datePart = item.createdAt ? formatIsoDateForDisplay(item.createdAt) : null;
    const bits: string[] = [];
    if (item.category) bits.push(supportCategoryLabel(item.category));
    if (item.priority) bits.push(supportPriorityLabel(item.priority));
    const meta = bits.join(" · ");
    if (datePart && meta) return `${datePart}  ·  ${meta}`;
    return datePart || meta || null;
  }
  if (item.type === "leave" && item.fromDate && item.toDate) {
    const a = formatYyyyMmDdForDisplay(item.fromDate);
    const b = formatYyyyMmDdForDisplay(item.toDate);
    if (a && b) return a === b ? a : `${a}  →  ${b}`;
    return a || b || null;
  }
  if (item.type === "permission" && item.permissionDate) {
    const p = formatYyyyMmDdForDisplay(item.permissionDate);
    if (p) {
      const st = formatMobileTimeString(item.startTime, locale);
      const en = formatMobileTimeString(item.endTime, locale);
      return st !== "—" || en !== "—" ? `${p}  ·  ${st}–${en}` : p;
    }
  }
  if ((item.type === "missed_punch" || item.type === "attendance_adjustment" || item.type === "overtime") && item.permissionDate) {
    return formatYyyyMmDdForDisplay(item.permissionDate);
  }
  return item.createdAt ? formatIsoDateForDisplay(item.createdAt) : null;
}

function sortRequests(list: EmployeeRequest[]): EmployeeRequest[] {
  return [...list].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });
}

function dedupeRequests(list: EmployeeRequest[]): EmployeeRequest[] {
  const map = new Map<string, EmployeeRequest>();
  for (const row of list) {
    const key = `${row.type}:${row.id}`;
    const prev = map.get(key);
    if (!prev || (row.type === "support" && (row.subject || row.category || row.priority))) {
      map.set(key, row);
    }
  }
  return [...map.values()];
}

function filterLabel(filter: RequestsFilter): string {
  if (filter === "all") return i18n.t("filterAll");
  if (filter === "pending") return i18n.t("requestStatusPending");
  if (filter === "approved") return i18n.t("requestStatusApproved");
  if (filter === "rejected") return i18n.t("requestStatusRejected");
  return i18n.t("support");
}

/**
 * Whether a request can be cancelled from the app. Backend cancel endpoint
 * (POST /api/requests/:id/cancel) covers pending Leave Applications and
 * Permission Requests only.
 */
function canCancelRequest(item: EmployeeRequest): boolean {
  return item.status === "pending" && (item.type === "leave" || item.type === "permission");
}

function RequestCard({
  item,
  isAr,
  onCancel,
  busy,
}: {
  item: EmployeeRequest;
  isAr: boolean;
  onCancel: (item: EmployeeRequest) => void;
  busy: boolean;
}) {
  const textAlign = isAr ? "right" : "left";
  const dateLabel = buildDateLabel(item, isAr ? "ar" : "en");
  const accentColor = statusAccentColor(item.status);

  const title = item.type === "support" ? item.subject || i18n.t("support") : dateLabel;
  const meta = item.type === "support" ? dateLabel : null;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => navigation.navigate("RequestDetail", { id: item.id, type: item.type })}
      style={({ pressed }) => pressed && styles.cardPressed}
    >
    <PremiumCard style={{ ...styles.card, borderStartWidth: 3, borderStartColor: accentColor }}>
      <View style={[styles.cardHeader, isAr && styles.rowReverse]}>
        <TypeChip type={item.type} />
        <View style={[styles.headerEnd, isAr && styles.rowReverse]}>
          <StatusPill label={statusLabel(item.status)} tone={statusTone(item.status)} numberOfLines={1} />
          <Ionicons name={isAr ? "chevron-back" : "chevron-forward"} size={16} color={colors.textMuted} />
        </View>
      </View>
      {title ? (
        <Text style={[styles.cardTitle, { textAlign }]} numberOfLines={2} selectable={false}>
          {title}
        </Text>
      ) : null}
      {meta ? (
        <Text style={[styles.cardMeta, { textAlign }]} selectable={false}>
          {meta}
        </Text>
      ) : null}
      {item.reason ? (
        <Text style={[styles.cardReason, { textAlign }]} numberOfLines={3}>
          {item.reason}
        </Text>
      ) : null}
      {item.id ? (
        <Text style={[styles.cardId, { textAlign }]}>{`${i18n.t("requestId")}  ${item.id}`}</Text>
      ) : null}
      {canCancelRequest(item) ? (
        <View style={[styles.cardActions, isAr && styles.rowReverse]}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => onCancel(item)}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed, busy && styles.cancelBtnDisabled]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Text style={styles.cancelBtnText}>{i18n.t("cancelRequest")}</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </PremiumCard>
    </Pressable>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <View style={styles.emptyWrap}>
      <EmptyPanel
        title={filtered ? i18n.t("noRequestsForFilter") : i18n.t("noRequestsAtAll")}
        hint={filtered ? i18n.t("noRequestsForFilterHint") : i18n.t("noRequestsAtAllHint")}
        children={
          <View style={styles.emptyIcon}>
            <View style={styles.emptyLine} />
            <View style={[styles.emptyLine, { width: "55%" }]} />
            <View style={styles.emptyLine} />
          </View>
        }
      />
    </View>
  );
}

export function MyRequestsScreen({ focused = true }: { focused?: boolean }) {
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<RequestsFilter>("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [requestsRes, supportRes] = await Promise.allSettled([
        requestService.getMyRequests(),
        requestService.getMySupportTickets(),
      ]);

      const mainRequests = requestsRes.status === "fulfilled" && Array.isArray(requestsRes.value) ? requestsRes.value : [];
      const supportTickets = supportRes.status === "fulfilled" && Array.isArray(supportRes.value) ? supportRes.value : [];

      if (requestsRes.status === "rejected") throw requestsRes.reason;

      const merged = dedupeRequests([...mainRequests, ...supportTickets]);
      setRequests(sortRequests(merged));
    } catch {
      setError(i18n.t("errorLoadRequests"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (focused) void load();
  }, [focused, load]);

  const handleCancel = useCallback(
    (item: EmployeeRequest) => {
      Alert.alert(i18n.t("cancelRequestConfirmTitle"), i18n.t("cancelRequestConfirmBody"), [
        { text: i18n.t("cancelRequestConfirmNo"), style: "cancel" },
        {
          text: i18n.t("cancelRequestConfirmYes"),
          style: "destructive",
          onPress: () => {
            setCancellingId(item.id);
            requestService
              .cancelRequest(item.id, item.type)
              .then(() => {
                Alert.alert(i18n.t("cancelRequestSuccess"));
                return load();
              })
              .catch(() => {
                Alert.alert(i18n.t("cancelRequestError"));
              })
              .finally(() => setCancellingId(null));
          },
        },
      ]);
    },
    [load]
  );

  const filteredRequests = useMemo(() => {
    if (activeFilter === "all") return requests;
    if (activeFilter === "support") return requests.filter((x) => x.type === "support");
    return requests.filter((x) => x.status === activeFilter);
  }, [requests, activeFilter]);

  const filters: RequestsFilter[] = ["all", "pending", "approved", "rejected", "support"];

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.filtersRow, isAr && styles.rowReverse]}>
        {filters.map((filter) => {
          const selected = activeFilter === filter;
          return (
            <Pressable
              key={filter}
              style={({ pressed }) => [
                styles.filterChip,
                selected ? styles.filterChipActive : undefined,
                pressed && styles.filterChipPressed,
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterChipText, selected ? styles.filterChipTextActive : undefined]}>{filterLabel(filter)}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => `${item.type}:${item.id}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.primary} colors={[colors.primary]} />
        }
        renderItem={({ item }) => (
          <RequestCard item={item} isAr={isAr} onCancel={handleCancel} busy={cancellingId === item.id} />
        )}
        ListEmptyComponent={loading ? <SkeletonList count={4} /> : <EmptyState filtered={activeFilter !== "all"} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  rowReverse: { flexDirection: "row-reverse" },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  filterChipPressed: { opacity: 0.88 },
  filterChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: -0.1,
  },
  filterChipTextActive: {
    color: colors.primaryDark,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: floatingTabBarBottomInset + 10,
    flexGrow: 1,
  },
  card: {
    marginBottom: 14,
    paddingVertical: 16,
    paddingHorizontal: 2,
  },
  cardLeave: { borderStartWidth: 3, borderStartColor: colors.primary },
  cardPermission: { borderStartWidth: 3, borderStartColor: colors.warning },
  cardSupport: { borderStartWidth: 3, borderStartColor: colors.success },
  cardMissedPunch: { borderStartWidth: 3, borderStartColor: colors.textSecondary },
  cardAttendanceAdj: { borderStartWidth: 3, borderStartColor: colors.warning },
  cardOvertime: { borderStartWidth: 3, borderStartColor: colors.primary },
  cardDeviceChange: { borderStartWidth: 3, borderStartColor: colors.ink },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  headerEnd: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 6,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  cardMeta: {
    ...typeStyles.caption,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
    fontVariant: ["tabular-nums"],
  },
  cardReason: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 10,
    fontWeight: "600",
  },
  cardId: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: "monospace",
    marginTop: 4,
    opacity: 0.8,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  cancelBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 18,
    paddingVertical: 9,
    minHeight: 38,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnPressed: { opacity: 0.85 },
  cancelBtnDisabled: { opacity: 0.6 },
  cancelBtnText: { fontSize: 13, fontWeight: "800", color: colors.danger, letterSpacing: -0.1 },
  typeChip: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  typeLeave: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
  typePermission: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: "rgba(0, 0, 0, 0.12)" },
  typeChipText: { fontSize: 12, fontWeight: "700" },
  typeLeaveText: { color: colors.primaryDark },
  typePermissionText: { color: colors.ink },
  typeSupport: { backgroundColor: colors.successLight, borderWidth: 1, borderColor: colors.success },
  typeSupportText: { color: colors.successDark },
  typeMissedPunch: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: "rgba(0, 0, 0, 0.14)" },
  typeMissedPunchText: { color: colors.ink },
  typeAttendanceAdj: { backgroundColor: colors.warningLight, borderWidth: 1, borderColor: colors.warning },
  typeAttendanceAdjText: { color: colors.ink },
  typeOvertime: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
  typeOvertimeText: { color: colors.primaryDark },
  typeDeviceChange: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border },
  typeDeviceChangeText: { color: colors.ink },
  emptyWrap: { flex: 1, paddingTop: 24, paddingHorizontal: 8 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 5,
  },
  emptyLine: { width: "70%", height: 3, borderRadius: 2, backgroundColor: colors.primary, opacity: 0.35 },
  errorBox: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: colors.dangerLight,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(211, 47, 47, 0.2)",
    borderStartWidth: 3,
    borderStartColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "700",
    lineHeight: 19,
  },
});
