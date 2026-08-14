import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppLocale } from "../../i18n/LocaleContext";
import { i18n } from "../../i18n";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";

export type AdatAlertTone = "info" | "success" | "danger";

export type AdatAlertConfig = {
  tone?: AdatAlertTone;
  title: string;
  message: string;
  /** Primary button label; defaults to OK. */
  confirmLabel?: string;
  /** When set, a secondary (cancel/dismiss) button appears with this label. */
  cancelLabel?: string;
  onConfirm?: () => void;
};

const toneIcon: Record<AdatAlertTone, { bg: string; fg: string }> = {
  info: { bg: colors.primaryLight, fg: colors.primaryDark },
  success: { bg: colors.successLight, fg: colors.successDark },
  danger: { bg: colors.dangerLight, fg: colors.danger },
};

/**
 * adat-styled modal alert (replaces raw Alert.alert). Arabic-first buttons, brand
 * surface, optional two-button action. Driven by state: pass `config` to show,
 * null to hide; `onClose` fires after either button.
 */
export function AdatAlert({
  config,
  onClose,
}: {
  config: AdatAlertConfig | null;
  onClose: () => void;
}) {
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const align = isAr ? "right" : "left";
  const tone = config?.tone ?? "info";
  const t = toneIcon[tone];

  return (
    <Modal visible={config != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={[styles.stripe, { backgroundColor: t.fg }]} />
          {config ? (
            <>
              <Text style={[styles.title, { textAlign: align }]}>{config.title}</Text>
              <Text style={[styles.message, { textAlign: align }]}>{config.message}</Text>
              <View style={[styles.buttons, isAr && styles.rowReverse]}>
                {config.cancelLabel ? (
                  <Pressable
                    onPress={onClose}
                    style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
                  >
                    <Text style={styles.btnGhostText}>{config.cancelLabel}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => {
                    const cb = config.onConfirm;
                    onClose();
                    cb?.();
                  }}
                  style={({ pressed }) => [
                    styles.btn,
                    { backgroundColor: tone === "danger" ? colors.danger : colors.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.btnText}>{config.confirmLabel ?? i18n.t("ok")}</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    overflow: "hidden",
  },
  stripe: { position: "absolute", top: 0, left: 0, right: 0, height: 4 },
  rowReverse: { flexDirection: "row-reverse" },
  title: { fontSize: 17, fontWeight: "800", color: colors.ink, letterSpacing: -0.2 },
  message: { fontSize: 14.5, fontWeight: "500", color: colors.textSecondary, lineHeight: 22 },
  buttons: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.xs },
  btn: {
    minWidth: 96,
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  btnText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  btnGhost: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border },
  btnGhostText: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.85 },
});
