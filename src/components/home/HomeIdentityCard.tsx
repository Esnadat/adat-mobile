import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { EmployeeAvatar } from "../ui/EmployeeAvatar";
import { colors } from "../../theme/colors";

type Props = {
  isAr: boolean;
  displayName?: string;
  companyLabel?: string;
  emailLabel?: string;
  avatarUrl?: string;
  initialSource: string;
};

export function HomeIdentityCard({ isAr, displayName, companyLabel, emailLabel, avatarUrl, initialSource }: Props) {
  const align = isAr ? "right" : "left";
  const rowStyle = isAr ? styles.rowAr : styles.rowEn;

  return (
    <View style={[styles.card, rowStyle]}>
      <View style={styles.accent} />
      <View style={styles.avatarRing}>
        <EmployeeAvatar photoUrl={avatarUrl} initialSource={initialSource} size={34} />
      </View>
      <View style={[styles.textCol, { alignItems: isAr ? "flex-end" : "flex-start" }]}>
        {displayName ? (
          <Text style={[styles.name, isAr && styles.noTrack, { textAlign: align }]} numberOfLines={1}>
            {displayName}
          </Text>
        ) : null}
        {companyLabel ? (
          <Text style={[styles.company, isAr && styles.noTrack, { textAlign: align }]} numberOfLines={1}>
            {companyLabel}
          </Text>
        ) : null}
        {!companyLabel && emailLabel ? (
          <Text style={[styles.email, isAr && styles.noTrack, { textAlign: align }]} numberOfLines={1}>
            {emailLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  noTrack: { letterSpacing: 0 },
  rowEn: { flexDirection: "row" },
  rowAr: { flexDirection: "row-reverse" },
  card: {
    position: "relative",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 9,
    paddingHorizontal: 11,
    alignItems: "center",
    gap: 8,
    marginBottom: 9,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  accent: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "rgba(13, 138, 78, 0.62)",
    left: 0,
  },
  avatarRing: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink,
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  company: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    lineHeight: 15,
  },
  email: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    lineHeight: 15,
  },
});
