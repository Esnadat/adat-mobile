import { Ionicons } from "../ui/NavIcons";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { PremiumCard } from "../ui/PremiumCard";
import { colors } from "../../theme/colors";

export type FingerprintAttendancePhase = "checkIn" | "checkOut" | "completed";

export type FingerprintActionCardProps = {
  phase: FingerprintAttendancePhase;
  loading: boolean;
  onFingerprintPress: () => void;
  actionLabel: string;
  isAr: boolean;
};

type FingerprintActionButtonProps = {
  phase: FingerprintAttendancePhase;
  loading: boolean;
  onPress: () => void;
  actionLabel: string;
  isAr: boolean;
  size?: number;
};

export function FingerprintActionButton({
  phase,
  loading,
  onPress,
  actionLabel,
  isAr,
  size = 76,
}: FingerprintActionButtonProps) {
  const noTrack = isAr ? { letterSpacing: 0 as const } : undefined;
  const isIn = phase === "checkIn";
  const isOut = phase === "checkOut";
  const isCompleted = phase === "completed";
  const circleSize = size;

  return (
    <View style={[styles.buttonWrap, isAr && styles.buttonWrapAr]}>
      <View style={[styles.fpAura, isIn ? styles.fpAuraIn : styles.fpAuraOut, isCompleted && styles.fpAuraCompleted]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          disabled={loading || isCompleted}
          onPress={onPress}
          style={({ pressed }) => [
            styles.fpOuter,
            { width: circleSize, height: circleSize, borderRadius: circleSize / 2 },
            isCompleted ? styles.fpOuterCompleted : isIn ? styles.fpOuterIn : styles.fpOuterOut,
            pressed && !loading && !isCompleted && styles.fpPressed,
            loading && styles.fpDisabled,
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.fpInnerRing,
              isCompleted ? styles.fpInnerRingCompleted : isIn ? styles.fpInnerRingIn : styles.fpInnerRingOut,
            ]}
          />
          {loading ? (
            <ActivityIndicator size="small" color={isIn || isOut ? colors.white : colors.ink} />
          ) : isCompleted ? (
            <Ionicons name="checkmark" size={24} color={colors.textSecondary} />
          ) : (
            <Ionicons name="finger-print-outline" size={26} color={isIn || isOut ? colors.white : colors.ink} />
          )}
        </Pressable>
      </View>
      {!isCompleted ? (
        <Text style={[styles.actionVerb, isIn ? styles.actionVerbIn : styles.actionVerbOut, noTrack]}>{actionLabel}</Text>
      ) : null}
    </View>
  );
}

export function FingerprintActionCard({ phase, loading, onFingerprintPress, actionLabel, isAr }: FingerprintActionCardProps) {
  return (
    <PremiumCard style={styles.legacyCard}>
      <FingerprintActionButton phase={phase} loading={loading} onPress={onFingerprintPress} actionLabel={actionLabel} isAr={isAr} />
    </PremiumCard>
  );
}

const styles = StyleSheet.create({
  legacyCard: { paddingVertical: 10, marginBottom: 10 },
  buttonWrap: { alignItems: "center", justifyContent: "center" },
  buttonWrapAr: { alignItems: "center" },
  fpAuraCompleted: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  fpOuterCompleted: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  fpInnerRingCompleted: {
    borderColor: colors.border,
  },
  actionVerb: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  fpPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  fpDisabled: {
    opacity: 0.9,
  },
  fpAura: {
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fpAuraIn: {
    borderColor: "rgba(0, 0, 0, 0.12)",
    backgroundColor: colors.surfaceSubtle,
  },
  fpAuraOut: {
    borderColor: "rgba(198, 40, 40, 0.2)",
    backgroundColor: colors.dangerLight,
  },
  fpOuter: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    overflow: "hidden",
  },
  fpInnerRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    margin: 6,
  },
  fpInnerRingIn: {
    borderColor: "rgba(255, 255, 255, 0.28)",
  },
  fpInnerRingOut: {
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  fpOuterIn: {
    backgroundColor: colors.success,
    borderColor: "rgba(13, 138, 78, 0.45)",
  },
  fpOuterOut: {
    backgroundColor: colors.danger,
    borderColor: "rgba(198, 40, 40, 0.45)",
  },
  actionVerbIn: {
    color: colors.successDark,
  },
  actionVerbOut: {
    color: colors.danger,
  },
});
