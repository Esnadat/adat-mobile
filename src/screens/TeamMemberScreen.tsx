import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { DetailShell } from "../components/ui/DetailShell";
import { EmployeeAvatar } from "../components/ui/EmployeeAvatar";
import { Ionicons } from "../components/ui/NavIcons";
import { StatusPill } from "../components/ui/StatusPill";
import { useAppLocale } from "../i18n/LocaleContext";
import { i18n } from "../i18n";
import { teamService, TeamMemberDetail } from "../services/teamService";
import { RootStackParamList } from "../types/navigation";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { shadowSoft } from "../theme/shadows";
import { formatYyyyMmDdForDisplay, formatMobileTimeString } from "../utils/mobileDateFormat";

function Row({ label, value, isAr }: { label: string; value: string; isAr: boolean }) {
  if (!value) return null;
  return (
    <View style={[styles.row, isAr && styles.rowReverse]}>
      <Text style={[styles.rowLabel, { textAlign: isAr ? "right" : "left" }]}>{label}</Text>
      <Text style={[styles.rowValue, { textAlign: isAr ? "left" : "right" }]}>{value}</Text>
    </View>
  );
}

export function TeamMemberScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "TeamMember">>();
  const { employee, name } = route.params;
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const align = isAr ? "right" : "left";

  const [detail, setDetail] = useState<TeamMemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const d = await teamService.getTeamMember(employee);
      setDetail(d);
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 403) setForbidden(true);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [employee]);

  useEffect(() => {
    void load();
  }, [load]);

  const p = detail?.profile;
  const displayName = p?.employee_name || name || employee;

  return (
    <DetailShell
      title={i18n.t("teamMemberTitle")}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      {loading && !detail ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : forbidden ? (
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={26} color={colors.textMuted} />
          <Text style={styles.muted}>{i18n.t("teamMemberForbidden")}</Text>
        </View>
      ) : !p ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{i18n.t("requestDetailNotFound")}</Text>
        </View>
      ) : (
        <>
          <View style={styles.heroCard}>
            <EmployeeAvatar photoUrl={null} initialSource={displayName} size={58} />
            <Text style={[styles.heroName, { textAlign: "center" }]} numberOfLines={1}>
              {displayName}
            </Text>
            {p.designation || p.department ? (
              <Text style={styles.heroSub} numberOfLines={1}>
                {[p.designation, p.department].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Row label={i18n.t("employeeId")} value={p.employee} isAr={isAr} />
            <Row label={i18n.t("teamMemberJoining")} value={formatYyyyMmDdForDisplay(p.date_of_joining) ?? ""} isAr={isAr} />
            <Row label={i18n.t("teamMemberStatus")} value={p.status} isAr={isAr} />
          </View>

          {p.mobile || p.email ? (
            <View style={styles.card}>
              {p.mobile ? (
                <Pressable onPress={() => void Linking.openURL(`tel:${p.mobile}`)} style={({ pressed }) => [styles.contactRow, isAr && styles.rowReverse, pressed && styles.pressed]}>
                  <Ionicons name="call-outline" size={19} color={colors.primaryDark} />
                  <Text style={[styles.contactText, { textAlign: align }]}>{p.mobile}</Text>
                </Pressable>
              ) : null}
              {p.email ? (
                <Pressable onPress={() => void Linking.openURL(`mailto:${p.email}`)} style={({ pressed }) => [styles.contactRow, isAr && styles.rowReverse, pressed && styles.pressed]}>
                  <Ionicons name="mail-outline" size={19} color={colors.primaryDark} />
                  <Text style={[styles.contactText, { textAlign: align }]} numberOfLines={1}>{p.email}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.pendingHeader, isAr && styles.rowReverse]}>
            <Text style={[styles.sectionTitle, { textAlign: align }]}>{i18n.t("teamMemberPending")}</Text>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{detail?.pendingRequests.length ?? 0}</Text>
            </View>
          </View>
          {(detail?.pendingRequests.length ?? 0) === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.muted}>{i18n.t("teamMemberNoPending")}</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {detail!.pendingRequests.map((r, i) => (
                <View key={`${r.type}:${r.id}`} style={[styles.pendingRow, isAr && styles.rowReverse, i > 0 && styles.pendingDivider]}>
                  <StatusPill label={r.type === "leave" ? i18n.t("requestTypeLeave") : i18n.t("requestTypePermission")} tone="warning" numberOfLines={1} />
                  <Text style={[styles.pendingMeta, { textAlign: isAr ? "left" : "right" }]} numberOfLines={1}>
                    {r.type === "leave"
                      ? `${formatYyyyMmDdForDisplay(r.from_date) ?? ""}${r.to_date && r.to_date !== r.from_date ? ` → ${formatYyyyMmDdForDisplay(r.to_date)}` : ""}`
                      : `${formatYyyyMmDdForDisplay(r.date) ?? ""} · ${formatMobileTimeString(r.start_time, locale)}–${formatMobileTimeString(r.end_time, locale)}`}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.note, { textAlign: align }]}>{i18n.t("teamMemberNote")}</Text>
        </>
      )}
    </DetailShell>
  );
}

const styles = StyleSheet.create({
  rowReverse: { flexDirection: "row-reverse" },
  center: { paddingVertical: spacing.xxxl, alignItems: "center", gap: spacing.sm },
  muted: { fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center" },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.lg,
    ...shadowSoft,
  },
  heroName: { fontSize: 18, fontWeight: "800", color: colors.ink, letterSpacing: -0.2 },
  heroSub: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadowSoft,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  rowLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  rowValue: { flex: 1, fontSize: 14, fontWeight: "800", color: colors.ink },
  contactRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 13, minHeight: 46 },
  contactText: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.primaryDark },
  pressed: { opacity: 0.7 },
  pendingHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: colors.ink, letterSpacing: -0.1 },
  countPill: { backgroundColor: colors.warningLight, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  countText: { fontSize: 12.5, fontWeight: "800", color: colors.warning, fontVariant: ["tabular-nums"] },
  pendingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingVertical: 11 },
  pendingDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  pendingMeta: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.ink, fontVariant: ["tabular-nums"] },
  emptyBox: { alignItems: "center", paddingVertical: spacing.xl, marginBottom: spacing.lg },
  note: { fontSize: 12, fontWeight: "600", color: colors.textMuted, lineHeight: 18 },
});
