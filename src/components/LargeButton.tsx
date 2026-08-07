import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors } from "../theme/colors";

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: ViewStyle;
  disabled?: boolean;
}

export function LargeButton({ title, onPress, loading = false, variant = "primary", style, disabled }: Props) {
  const isDisabled = loading || disabled;
  const spinnerColor = isDisabled ? colors.textMuted : variant === "secondary" ? colors.primaryDark : colors.white;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        variant === "primary" && pressed && !isDisabled ? styles.primaryPressed : null,
        variant === "danger" && pressed && !isDisabled ? styles.dangerPressed : null,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={[styles.text, variant === "secondary" && styles.textSecondary, isDisabled && styles.textDisabled]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: colors.success,
  },
  primaryPressed: {
    backgroundColor: colors.successDark,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  dangerPressed: {
    backgroundColor: "#A91F1F",
  },
  disabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
    borderWidth: 1,
  },
  text: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  textSecondary: {
    color: colors.ink,
  },
  textDisabled: {
    color: colors.textMuted,
  },
});
