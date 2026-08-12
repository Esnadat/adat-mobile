import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { PremiumCard } from "../components/ui/PremiumCard";
import { useAppLocale } from "../i18n/LocaleContext";
import { colors } from "../theme/colors";
import { floatingTabBarBottomInset } from "../theme/shadows";
import { getApiErrorMessage } from "../services/http";
import { teamService, type TeamMember, type TeamAttendanceEntry } from "../services/teamService";

export function MyTeamScreen() {
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const align = isAr ? "right" : "left";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [attendance, setAttendance] = useState<Map<string, TeamAttendanceEntry>>(new Map());

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [m, a] = await Promise.all([
          teamService.getTeamMembers(),
          teamService.getTeamAttendanceToday(),
        ]);
        if (!active) return;
        setMembers(m);
        setAttendance(a);
      } catch (e) {
        if (!active) return;
        setError(getApiErrorMessage(e));
        setMembers([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const statusLabel = (m: TeamMember): string => {
    const a = attendance.get(m.employeeId) || attendance.get(m.id);
    if (a?.checkIn && !a?.checkOut) return isAr ? "حاضر" : "Present";
    if (a?.checkIn && a?.checkOut) return isAr ? "انصرف" : "Checked out";
    if (a?.status) return a.status;
    return isAr ? "لم يسجّل" : "Not in";
  };

  return (
    <ScrollView style={styles.outer} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.hint, { textAlign: align }]}>
        {isAr
          ? "التابعون المباشرون وحضورهم اليوم (عرض فقط)."
          : "Your direct reports and today's attendance (view only)."}
      </Text>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.successDark} />
        </View>
      ) : error ? (
        <PremiumCard style={styles.card}>
          <Text style={[styles.errTxt, { textAlign: align }]}>{error}</Text>
        </PremiumCard>
      ) : members.length === 0 ? (
        <PremiumCard style={styles.card}>
          <Text style={[styles.emptyTxt, { textAlign: align }]}>
            {isAr ? "لا يوجد تابعون مباشرون." : "No direct reports."}
          </Text>
        </PremiumCard>
      ) : (
        members.map((m) => (
          <PremiumCard key={m.id} style={styles.card}>
            <View style={[styles.row, isAr && styles.rowR]}>
              <View style={styles.flex1}>
                <Text style={[styles.name, { textAlign: align }]} numberOfLines={1}>
                  {m.name}
                </Text>
                {m.position ? (
                  <Text style={[styles.meta, { textAlign: align }]} numberOfLines={1}>
                    {m.position}
                  </Text>
                ) : null}
                {m.department ? (
                  <Text style={[styles.meta, { textAlign: align }]} numberOfLines={1}>
                    {m.department}
                  </Text>
                ) : null}
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{statusLabel(m)}</Text>
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
  hint: { fontSize: 13, color: colors.textMuted, fontWeight: "600", marginBottom: 8, lineHeight: 19 },
  center: { paddingVertical: 32, alignItems: "center" },
  card: { marginTop: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowR: { flexDirection: "row-reverse" },
  flex1: { flex: 1 },
  name: { fontSize: 16, fontWeight: "800", color: colors.ink },
  meta: { fontSize: 12.5, fontWeight: "600", color: colors.textMuted, marginTop: 2 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
  },
  badgeTxt: { fontSize: 11, fontWeight: "800", color: colors.successDark },
  errTxt: { fontSize: 14, color: colors.danger, fontWeight: "600" },
  emptyTxt: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
});
