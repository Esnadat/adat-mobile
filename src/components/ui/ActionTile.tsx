import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useAppLocale } from "../../i18n/LocaleContext";
import { colors } from "../../theme/colors";
import { shadowSoft } from "../../theme/shadows";

export type ActionTileVisualTone = "default" | "active" | "soon";

type Props = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
  disabled?: boolean;
  showChevron?: boolean;
  style?: ViewStyle;
  visualTone?: ActionTileVisualTone;
  variant?: "horizontal" | "vertical";
};

export function ActionTile({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
  showChevron,
  style,
  visualTone = "default",
  variant = "horizontal",
}: Props) {
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const textAlign: "left" | "right" = isAr ? "right" : "left";
  const isVertical = variant === "vertical";

  const cardTone = [
    styles.card,
    visualTone === "active" && styles.cardActive,
    visualTone === "soon" && styles.cardSoon,
    isVertical && styles.cardV,
  ];

  const iconWrapTone = [
    styles.iconWrap,
    visualTone === "active" && styles.iconWrapActive,
    visualTone === "soon" && styles.iconWrapSoon,
    isVertical && styles.iconWrapV,
  ];

  const subTone = [
    isVertical ? styles.subV : styles.sub,
    visualTone === "active" && styles.subActive,
    visualTone === "soon" && styles.subSoon,
    !isVertical && { textAlign },
  ];

  const body = (
    <>
      <View style={iconWrapTone}>{icon}</View>
      <View style={[styles.textCol, isVertical && styles.textColV]}>
        <Text
          style={[
            isVertical ? styles.titleV : styles.title,
            !isVertical && { textAlign },
          ]}
        >
          {title}
        </Text>
        <Text style={subTone}>{subtitle}</Text>
      </View>
      {!isVertical && showChevron && !disabled ? (
        <Text style={styles.chev} allowFontScaling={false}>
          ‹
        </Text>
      ) : null}
    </>
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardTone, pressed && styles.pressed, style]}
      >
        {body}
      </Pressable>
    );
  }

  return <View style={[cardTone, style]}>{body}</View>;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
    ...shadowSoft,
  },
  cardActive: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  cardSoon: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 0,
  },
  iconWrapSoon: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textCol: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 2,
  },
  sub: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    lineHeight: 18,
  },
  subActive: {
    color: colors.textSecondary,
  },
  subSoon: {
    color: colors.textSecondary,
  },
  chev: {
    fontSize: 22,
    color: colors.textSecondary,
    fontWeight: "300",
  },
  cardV: {
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 14,
  },
  iconWrapV: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginBottom: 14,
  },
  textColV: { alignItems: "center", width: "100%", flex: 0 },
  titleV: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
    marginBottom: 2,
  },
  subV: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
    color: colors.textSecondary,
  },
});
