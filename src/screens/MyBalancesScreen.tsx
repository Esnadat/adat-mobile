import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { PremiumCard } from "../components/ui/PremiumCard";
import { useAppLocale } from "../i18n/LocaleContext";
import { colors } from "../theme/colors";
import { floatingTabBarBottomInset } from "../theme/shadows";
import { getApiErrorMessage } from "../services/http";
import { requestService } from "../services/requestService";

interface BalanceRow {
  name: string;
  label: string;
  availableDays: number | null;
}

/** Today (YYYY-MM-DD) — used as a single-day window to read the current balance. */
function todayKey(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function MyBalancesScreen() {
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const align = isAr ? "right" : "left";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BalanceRow[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const types = await requestService.getLeaveTypes();
        const day = todayKey();
        const results = await Promise.all(
          types.map(async (t) => {
            try {
              const check = await requestService.checkLeaveBalance({
                leaveType: t.name,
                fromDate: day,
                toDate: day,
              });
              return { name: t.name, label: t.label, availableDays: check.availableDays ?? null };
            } catch {
              return { name: t.name, label: t.label, availableDays: null };
            }
          })
        );
        if (!active) return;
        setRows(results);
      } catch (e) {
        if (!active) return;
        setError(getApiErrorMessage(e));
        setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const fmt = (v: number | null): string => (v == null ? (isAr ? "—" : "—") : String(v));

  return (
    <ScrollView style={styles.outer} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.hint, { textAlign: align }]}>
        {isAr ? "رصيد الإجازات المتاح حالياً لكل نوع." : "Your current available leave balance per type."}
      </Text>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.successDark} />
        </View>
      ) : error ? (
        <PremiumCard style={styles.card}>
          <Text style={[styles.errTxt, { textAlign: align }]}>{error}</Text>
        </PremiumCard>
      ) : rows.length === 0 ? (
        <PremiumCard style={styles.card}>
          <Text style={[styles.emptyTxt, { textAlign: align }]}>
            {isAr ? "لا توجد أنواع إجازات." : "No leave types."}
          </Text>
        </PremiumCard>
      ) : (
        rows.map((r) => (
          <PremiumCard key={r.name} style={styles.card}>
            <View style={[styles.row, isAr && styles.rowR]}>
              <Text style={[styles.type, { textAlign: align }]} numberOfLines={1}>
                {r.label}
              </Text>
              <View style={styles.balancePill}>
                <Text style={styles.balanceNum}>{fmt(r.availableDays)}</Text>
                <Text style={styles.balanceUnit}>{isAr ? "يوم" : "days"}</Text>
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
  row: { flexDirection: "row", alignItems: "center", gap: 12, justifyContent: "space-between" },
  rowR: { flexDirection: "row-reverse" },
  type: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.ink },
  balancePill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
  },
  balanceNum: { fontSize: 18, fontWeight: "800", color: colors.successDark, fontVariant: ["tabular-nums"] },
  balanceUnit: { fontSize: 11, fontWeight: "700", color: colors.successDark },
  errTxt: { fontSize: 14, color: colors.danger, fontWeight: "600" },
  emptyTxt: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
});
