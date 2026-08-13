import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AssignedLocation } from "../../types/api";
import { i18n } from "../../i18n";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";

const BOX = 200; // px, the square plotting area
const CENTER = BOX / 2;

type UserCoords = { latitude: number; longitude: number } | null;

/** Great-circle-ish local offset (meters) of `user` from `center` — flat-earth is fine at this scale. */
function offsetMeters(center: AssignedLocation, user: { latitude: number; longitude: number }) {
  const north = (user.latitude - center.latitude) * 111320;
  const east = (user.longitude - center.longitude) * 111320 * Math.cos((center.latitude * Math.PI) / 180);
  return { north, east, distance: Math.sqrt(north * north + east * east) };
}

/**
 * Lightweight geofence "range map" rendered with plain Views (no native map / API key):
 * the allowed zone as a scaled circle, the site at center, and — when we have the
 * user's GPS — their position and remaining distance, with an inside/outside status.
 */
export function GeofenceView({
  location,
  userCoords,
  isAr,
}: {
  location: AssignedLocation;
  userCoords: UserCoords;
  isAr?: boolean;
}) {
  const off = userCoords ? offsetMeters(location, userCoords) : null;
  const inside = off ? off.distance <= location.radiusMeters : null;

  // Scale so the zone circle and the user dot both fit with margin.
  const maxMeters = Math.max(location.radiusMeters * 1.6, (off?.distance ?? 0) * 1.15, 30);
  const pxPerMeter = (BOX / 2) / maxMeters;
  const zoneR = Math.min(CENTER, location.radiusMeters * pxPerMeter);

  let userLeft = CENTER;
  let userTop = CENTER;
  if (off) {
    userLeft = CENTER + off.east * pxPerMeter;
    userTop = CENTER - off.north * pxPerMeter; // screen y grows downward
    userLeft = Math.max(6, Math.min(BOX - 6, userLeft));
    userTop = Math.max(6, Math.min(BOX - 6, userTop));
  }

  const statusColor = inside == null ? colors.textMuted : inside ? colors.success : colors.danger;
  const distanceLabel =
    off == null
      ? i18n.t("geofenceLocating")
      : inside
      ? i18n.t("geofenceInside")
      : `${i18n.t("geofenceOutsideBy")} ${Math.round(off.distance - location.radiusMeters)} ${i18n.t("geofenceMeters")}`;

  return (
    <View style={styles.card}>
      <View style={[styles.headerRow, isAr && styles.rowReverse]}>
        <Text style={[styles.title, { textAlign: isAr ? "right" : "left" }]} numberOfLines={1}>
          {i18n.t("geofenceTitle")}
        </Text>
        {location.locationName ? (
          <View style={styles.sitePill}>
            <Text style={styles.sitePillText} numberOfLines={1}>
              {location.locationName}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.plot}>
        {/* allowed zone */}
        <View
          style={[
            styles.zone,
            {
              width: zoneR * 2,
              height: zoneR * 2,
              borderRadius: zoneR,
              left: CENTER - zoneR,
              top: CENTER - zoneR,
            },
          ]}
        />
        {/* site center */}
        <View style={[styles.center, { left: CENTER - 5, top: CENTER - 5 }]} />
        {/* user */}
        {off ? (
          <View
            style={[
              styles.user,
              { left: userLeft - 7, top: userTop - 7, borderColor: statusColor, backgroundColor: statusColor },
            ]}
          />
        ) : null}
      </View>

      <View style={[styles.legendRow, isAr && styles.rowReverse]}>
        <Text style={[styles.radiusText, { textAlign: isAr ? "right" : "left" }]}>
          {`${i18n.t("geofenceRadius")} ${Math.round(location.radiusMeters)} ${i18n.t("geofenceMeters")}`}
        </Text>
        <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
          {distanceLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowReverse: { flexDirection: "row-reverse" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  title: { flex: 1, fontSize: 14, fontWeight: "800", color: colors.ink, letterSpacing: -0.1 },
  sitePill: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    maxWidth: 160,
  },
  sitePillText: { fontSize: 12, fontWeight: "700", color: colors.primaryDark },
  plot: {
    width: BOX,
    height: BOX,
    alignSelf: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: "hidden",
  },
  zone: {
    position: "absolute",
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: "rgba(22,163,74,0.10)",
  },
  center: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryDark,
    borderWidth: 2,
    borderColor: colors.white,
  },
  user: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: colors.white,
  },
  legendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  radiusText: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  statusText: { fontSize: 12.5, fontWeight: "800", fontVariant: ["tabular-nums"] },
});
