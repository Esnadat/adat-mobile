import React, { useEffect, useState } from "react";
import { Image, ImageStyle, StyleSheet, Text, View, ViewStyle } from "react-native";
import { getEmployeeDisplayInitial } from "../../utils/employeeAvatarUri";

type Props = {
  photoUrl?: string | null;
  /** Used to derive the initial when there is no photo (e.g. name or email). */
  initialSource: string;
  size: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
};

/**
 * Remote photo when available; otherwise a solid circle with a visible initial (Expo-safe).
 */
export function EmployeeAvatar({ photoUrl, initialSource, size, style, imageStyle }: Props) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const trimmed = photoUrl?.trim() ?? "";
  const showPhoto = Boolean(trimmed && !photoFailed);
  const letter = getEmployeeDisplayInitial(initialSource);
  const radius = size / 2;
  const dim = { width: size, height: size, borderRadius: radius };
  const fontSize =
    size >= 72 ? Math.min(42, Math.max(34, Math.round(size * 0.38))) : Math.min(22, Math.max(17, Math.round(size * 0.42)));

  useEffect(() => {
    setPhotoFailed(false);
  }, [trimmed]);

  if (showPhoto) {
    return (
      <Image
        source={{ uri: trimmed }}
        style={[dim, styles.photo, imageStyle]}
        resizeMode="cover"
        onError={() => setPhotoFailed(true)}
      />
    );
  }

  return (
    <View style={[dim, styles.fallback, style]}>
      <Text style={[styles.letter, { fontSize }]} allowFontScaling={false}>
        {letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    backgroundColor: "#111111",
  },
  fallback: {
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  letter: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
  },
});
