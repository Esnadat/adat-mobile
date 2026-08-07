import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { i18n } from "../../i18n";
import { colors } from "../../theme/colors";
import { EstablishmentAnnouncement } from "../../types/api";
import { PremiumCard } from "../ui/PremiumCard";
import { SectionIcon } from "../ui/SectionIcon";
import { StatusPill, StatusPillTone } from "../ui/StatusPill";
import { homeSectionStyles } from "./homeSectionStyles";

type Props = {
  items: EstablishmentAnnouncement[];
  loading?: boolean;
  isAr: boolean;
};

function pickText(isAr: boolean, ar?: string, en?: string): string {
  const primary = isAr ? ar : en;
  const fallback = isAr ? en : ar;
  return (primary || fallback || "").trim();
}

function normalizePriorityLabel(raw: string, isAr: boolean): string {
  const value = raw.trim().toLowerCase();
  if (value === "high" || value === "urgent") return i18n.t("announcementPriorityHigh");
  if (value === "normal" || value === "medium") return i18n.t("announcementPriorityNormal");
  if (value === "low") return i18n.t("announcementPriorityLow");
  return isAr ? `الأولوية: ${raw}` : `Priority: ${raw}`;
}

function priorityTone(raw: string): StatusPillTone {
  const v = raw.trim().toLowerCase();
  if (v === "high" || v === "urgent") return "danger";
  if (v === "low") return "neutral";
  if (v === "normal" || v === "medium") return "warning";
  return "neutral";
}

export function HomeAnnouncements({ items, loading = false, isAr }: Props) {
  if (!loading && items.length === 0) return null;

  const align = isAr ? "right" : "left";
  const visibleItems = items.slice(0, 2);

  return (
    <PremiumCard style={homeSectionStyles.card}>
      <View style={[styles.sectionHead, isAr ? styles.sectionHeadAr : styles.sectionHeadEn]}>
        <SectionIcon name="megaphone-outline" tone="success" />
        <Text style={[homeSectionStyles.sectionTitle, styles.sectionTitle, { textAlign: align }]}>
          {i18n.t("homeAnnouncementsTitle")}
        </Text>
      </View>

      {loading ? (
        <View style={homeSectionStyles.loadingRow} accessibilityState={{ busy: true }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[homeSectionStyles.loadingLabel, { textAlign: align }]}>{i18n.t("loading")}</Text>
        </View>
      ) : (
        visibleItems.map((item, index) => {
          const title = pickText(isAr, item.title_ar, item.title_en) || "-";
          const body = pickText(isAr, item.body_ar, item.body_en);
          const priorityRaw = (item.priority || "").trim();
          const priorityLabel = priorityRaw ? normalizePriorityLabel(priorityRaw, isAr) : "";

          return (
            <View key={item.id || String(index)} style={[styles.row, index > 0 && styles.rowBorder]}>
              <View style={[styles.headRow, isAr ? styles.headRowAr : styles.headRowEn]}>
                <Text style={[styles.title, { textAlign: align }]} numberOfLines={2}>
                  {title}
                </Text>
                {priorityLabel ? (
                  <View style={isAr ? styles.pillWrapAr : styles.pillWrapEn}>
                    <StatusPill label={priorityLabel} tone={priorityTone(priorityRaw)} numberOfLines={1} />
                  </View>
                ) : null}
              </View>
              {body ? (
                <Text style={[styles.body, { textAlign: align }]} numberOfLines={3}>
                  {body}
                </Text>
              ) : null}
            </View>
          );
        })
      )}
    </PremiumCard>
  );
}

const styles = StyleSheet.create({
  sectionHead: {
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionHeadEn: { flexDirection: "row" },
  sectionHeadAr: { flexDirection: "row-reverse" },
  sectionTitle: {
    marginBottom: 0,
    flex: 1,
  },
  row: {
    paddingVertical: 8,
  },
  pillWrapEn: { marginStart: 8, maxWidth: "46%" },
  pillWrapAr: { marginEnd: 8, maxWidth: "46%" },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  headRow: {
    alignItems: "center",
    gap: 8,
  },
  headRowEn: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headRowAr: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 18,
  },
  body: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
