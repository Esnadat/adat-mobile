import React, { useEffect, useRef } from "react";
import { Animated, DimensionValue, Easing, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import { radius as radiusTokens, spacing } from "../../theme/spacing";

/**
 * A single shimmering placeholder block. Uses RN Animated (no reanimated dependency);
 * a gentle opacity pulse conveys "loading" without a lone spinner. Honors the design
 * system's rule of skeletons over spinners for data placeholders.
 */
export function Skeleton({
  width = "100%",
  height = 14,
  radius = radiusTokens.sm,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceElevated, opacity: pulse }, style]}
    />
  );
}

/** A card-shaped skeleton row matching the app's list/record cards. */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={52} height={52} radius={12} />
        <View style={styles.lines}>
          <Skeleton width="55%" height={13} />
          <Skeleton width="80%" height={11} />
          <Skeleton width="40%" height={11} />
        </View>
      </View>
    </View>
  );
}

/** N stacked skeleton cards for list-loading states. */
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  lines: { flex: 1, gap: spacing.sm },
});
