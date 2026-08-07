import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { FingerprintActionButton, FingerprintAttendancePhase } from "../attendance/FingerprintActionCard";
import { PremiumCard } from "../ui/PremiumCard";
import { colors } from "../../theme/colors";

type Props = {
  isAr: boolean;
  timeLabel: string;
  dateLabel: string;
  phaseSummary: string;
  phase: FingerprintAttendancePhase;
  loading: boolean;
  actionLabel: string;
  onActionPress: () => void;
  gpsNote: string;
  checkInFooterHint?: string;
  lastCheckInTime?: string | null;
  lastCheckOutTime?: string | null;
  todayLabel: string;
};

export function HomeHeroBand({
  isAr,
  timeLabel,
  dateLabel,
  phaseSummary,
  phase,
  loading,
  actionLabel,
  onActionPress,
  gpsNote,
  checkInFooterHint,
  lastCheckInTime,
  lastCheckOutTime,
  todayLabel,
}: Props) {
  const align = isAr ? "right" : "left";
  const hasTimes = Boolean(lastCheckInTime || lastCheckOutTime);

  return (
    <PremiumCard style={styles.band}>
      <View style={[styles.topRow, isAr ? styles.rowAr : styles.rowEn]}>
        <View style={[styles.statusCol, { alignItems: isAr ? "flex-end" : "flex-start" }]}>
          <Text style={[styles.kicker, { textAlign: align }]}>{todayLabel}</Text>
          <Text style={[styles.time, isAr && styles.noTrack, { textAlign: align }]}>{timeLabel}</Text>
          <Text style={[styles.date, isAr && styles.noTrack, { textAlign: align }]}>{dateLabel}</Text>
          <Text style={[styles.phase, { textAlign: align }]} numberOfLines={3}>
            {phaseSummary}
          </Text>
          {hasTimes ? (
            <Text style={[styles.latestTimes, isAr && styles.noTrack, { textAlign: align }]}>
              {[lastCheckInTime, lastCheckOutTime].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </View>
        <View style={styles.actionCol}>
          <FingerprintActionButton
            phase={phase}
            loading={loading}
            onPress={onActionPress}
            actionLabel={actionLabel}
            isAr={isAr}
            size={90}
          />
        </View>
      </View>
      <View style={styles.footerStrip}>
        <Text style={[styles.gpsLine, { textAlign: align }]} numberOfLines={2}>
          {gpsNote}
        </Text>
        {phase === "checkIn" && checkInFooterHint ? (
          <Text style={[styles.helperLine, { textAlign: align }]} numberOfLines={2}>
            {checkInFooterHint}
          </Text>
        ) : null}
      </View>
    </PremiumCard>
  );
}

const styles = StyleSheet.create({
  noTrack: { letterSpacing: 0 },
  band: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: "hidden",
  },
  topRow: {
    alignItems: "stretch",
    justifyContent: "space-between",
    minHeight: 174,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  rowEn: { flexDirection: "row" },
  rowAr: { flexDirection: "row-reverse" },
  statusCol: { flex: 1, minWidth: 0, justifyContent: "center" },
  actionCol: { justifyContent: "center", alignItems: "center", marginStart: 8 },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  time: {
    fontSize: 38,
    fontWeight: "800",
    color: colors.ink,
    lineHeight: 44,
    fontVariant: ["tabular-nums"],
  },
  date: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  phase: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
    lineHeight: 20,
  },
  latestTimes: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  footerStrip: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  gpsLine: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    lineHeight: 17,
  },
  helperLine: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 17,
  },
});
