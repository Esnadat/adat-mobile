import React from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { AssignedLocation } from "../../types/api";
import { i18n } from "../../i18n";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";

type UserCoords = { latitude: number; longitude: number } | null;

/** Flat-earth local distance (meters) between user and center — fine at geofence scale. */
function distanceMeters(center: AssignedLocation, user: { latitude: number; longitude: number }) {
  const north = (user.latitude - center.latitude) * 111320;
  const east = (user.longitude - center.longitude) * 111320 * Math.cos((center.latitude * Math.PI) / 180);
  return Math.sqrt(north * north + east * east);
}

/**
 * Real Google/Apple map of the attendance geofence: the allowed zone as a circle, the
 * site marker, the user's position when known, plus remaining distance / inside-outside
 * status. Android uses Google Maps (key injected via app.config from the EAS secret);
 * iOS uses Apple Maps (PROVIDER_DEFAULT).
 */
export function GeofenceMap({
  location,
  userCoords,
  isAr,
}: {
  location: AssignedLocation;
  userCoords: UserCoords;
  isAr?: boolean;
}) {
  const dist = userCoords ? distanceMeters(location, userCoords) : null;
  const inside = dist != null ? dist <= location.radiusMeters : null;

  // Region wide enough to show the whole zone (and the user if further out), with margin.
  const spanMeters = Math.max(location.radiusMeters * 3, (dist ?? 0) * 2.4, 200);
  const latDelta = spanMeters / 111320;
  const lngDelta = latDelta / Math.max(0.2, Math.cos((location.latitude * Math.PI) / 180));

  const statusColor = inside == null ? colors.textMuted : inside ? colors.success : colors.danger;
  const distanceLabel =
    dist == null
      ? i18n.t("geofenceLocating")
      : inside
      ? i18n.t("geofenceInside")
      : `${i18n.t("geofenceOutsideBy")} ${Math.round(dist - location.radiusMeters)} ${i18n.t("geofenceMeters")}`;

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

      <View style={styles.mapWrap}>
        <MapView
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          pointerEvents="none"
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: latDelta,
            longitudeDelta: lngDelta,
          }}
        >
          <Circle
            center={{ latitude: location.latitude, longitude: location.longitude }}
            radius={location.radiusMeters}
            strokeColor={colors.primary}
            strokeWidth={2}
            fillColor="rgba(22,163,74,0.12)"
          />
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title={location.locationName ?? undefined}
            pinColor={colors.primaryDark}
          />
          {userCoords ? (
            <Marker
              coordinate={userCoords}
              pinColor={inside ? colors.success : colors.danger}
              title={i18n.t("geofenceYouAreHere")}
            />
          ) : null}
        </MapView>
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
  sitePill: { backgroundColor: colors.primaryLight, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, maxWidth: 160 },
  sitePillText: { fontSize: 12, fontWeight: "700", color: colors.primaryDark },
  mapWrap: {
    height: 200,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceSubtle,
  },
  legendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  radiusText: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  statusText: { fontSize: 12.5, fontWeight: "800", fontVariant: ["tabular-nums"] },
});
