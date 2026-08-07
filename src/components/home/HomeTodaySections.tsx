import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { PremiumCard } from "../ui/PremiumCard";
import { SectionIcon } from "../ui/SectionIcon";
import { i18n } from "../../i18n";
import { colors } from "../../theme/colors";
import { homeSectionStyles } from "./homeSectionStyles";

export type HomeScheduleRow = {
  id: string;
  title: string;
  time?: string;
  status?: string;
};

export type HomeTaskRow = {
  id: string;
  title: string;
  due?: string;
  status?: string;
};

type Props = {
  isAr: boolean;
  /** When no service is wired, pass `undefined` or empty arrays — empty copy is shown (no fake rows). */
  calendarRows?: HomeScheduleRow[];
  taskRows?: HomeTaskRow[];
  calendarLoading?: boolean;
  tasksLoading?: boolean;
};

function RowLine({
  title,
  meta,
  isAr,
  showTopBorder,
  emphasizeTitle = false,
}: {
  title: string;
  meta?: string;
  isAr: boolean;
  showTopBorder: boolean;
  /** Stronger title style for open-task rows on the home dashboard. */
  emphasizeTitle?: boolean;
}) {
  const align = isAr ? "right" : "left";
  return (
    <View style={[styles.row, showTopBorder && styles.rowBorder]}>
      <Text
        style={[styles.rowTitle, emphasizeTitle && styles.rowTitleEmphasis, { textAlign: align }]}
        numberOfLines={2}
      >
        {title}
      </Text>
      {meta ? (
        <Text style={[styles.rowMeta, emphasizeTitle && styles.rowMetaEmphasis, { textAlign: align }]} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

export function HomeTodaySections({
  isAr,
  calendarRows = [],
  taskRows = [],
  calendarLoading = false,
  tasksLoading = false,
}: Props) {
  const align = isAr ? "right" : "left";
  const showCal = calendarRows.length > 0;
  const showTasks = taskRows.length > 0;

  return (
    <View style={styles.wrap}>
      <PremiumCard style={homeSectionStyles.card}>
        <View style={[styles.sectionHead, isAr ? styles.sectionHeadAr : styles.sectionHeadEn]}>
          <SectionIcon name="calendar-outline" tone="success" />
          <Text style={[homeSectionStyles.sectionTitle, styles.sectionTitle, { textAlign: align }]}>
            {i18n.t("homeCalendarTodayTitle")}
          </Text>
        </View>
        {calendarLoading ? (
          <View style={homeSectionStyles.loadingRow} accessibilityState={{ busy: true }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[homeSectionStyles.loadingLabel, { textAlign: align }]}>{i18n.t("loading")}</Text>
          </View>
        ) : showCal ? (
          calendarRows.slice(0, 3).map((r, idx) => (
            <RowLine
              key={r.id}
              title={r.title}
              meta={[r.time, r.status].filter(Boolean).join(" · ") || undefined}
              isAr={isAr}
              showTopBorder={idx > 0}
            />
          ))
        ) : (
          <Text style={[styles.empty, { textAlign: align }]}>{i18n.t("homeCalendarTodayEmpty")}</Text>
        )}
      </PremiumCard>

      <PremiumCard style={homeSectionStyles.card}>
        <View style={[styles.sectionHead, isAr ? styles.sectionHeadAr : styles.sectionHeadEn]}>
          <SectionIcon name="list-outline" />
          <Text style={[homeSectionStyles.sectionTitle, styles.sectionTitle, { textAlign: align }]}>
            {i18n.t("homeOpenTasksTitle")}
          </Text>
        </View>
        {tasksLoading ? (
          <View style={homeSectionStyles.loadingRow} accessibilityState={{ busy: true }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[homeSectionStyles.loadingLabel, { textAlign: align }]}>{i18n.t("loading")}</Text>
          </View>
        ) : showTasks ? (
          taskRows.slice(0, 3).map((r, idx) => (
            <RowLine
              key={r.id}
              title={r.title}
              meta={[r.due, r.status].filter(Boolean).join(" · ") || undefined}
              isAr={isAr}
              showTopBorder={idx > 0}
              emphasizeTitle
            />
          ))
        ) : (
          <Text style={[styles.empty, { textAlign: align }]}>{i18n.t("homeOpenTasksEmpty")}</Text>
        )}
      </PremiumCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 2, gap: 0 },
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
  empty: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    lineHeight: 20,
    paddingVertical: 6,
  },
  row: {
    paddingVertical: 8,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 18,
  },
  rowTitleEmphasis: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.15,
    lineHeight: 20,
  },
  rowMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  rowMetaEmphasis: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
});
