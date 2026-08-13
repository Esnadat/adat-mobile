import * as Haptics from "expo-haptics";

/**
 * Thin, crash-safe wrappers around expo-haptics. Every call is guarded so a
 * missing native module or an unsupported device can never break a user flow.
 */
export function hapticSuccess(): void {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* no-op */
  }
}

export function hapticError(): void {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    /* no-op */
  }
}

export function hapticLight(): void {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* no-op */
  }
}
