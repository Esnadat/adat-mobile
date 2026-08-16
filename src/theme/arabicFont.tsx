import React from "react";
import { StyleSheet, Text, TextInput } from "react-native";

/**
 * The app previously used the OS system font for Arabic, whose shaping is unreliable
 * on Android (distorted glyphs on correct strings). We bundle IBM Plex Sans Arabic and
 * apply it globally by mapping each numeric fontWeight to the matching weight file.
 *
 * Applied by patching Text/TextInput render once at startup, so the hundreds of existing
 * styles (which set fontWeight, not fontFamily) all pick up the correct Arabic font
 * without being edited. Styles that set an explicit family (e.g. monospace for IDs) are
 * left untouched.
 */
export const ARABIC_FONTS = {
  regular: "IBMPlexSansArabic_400Regular",
  medium: "IBMPlexSansArabic_500Medium",
  semibold: "IBMPlexSansArabic_600SemiBold",
  bold: "IBMPlexSansArabic_700Bold",
} as const;

function familyForWeight(weight?: string | number | null): string {
  if (weight === "bold") return ARABIC_FONTS.bold;
  const n = typeof weight === "number" ? weight : Number.parseInt(String(weight ?? ""), 10);
  if (!Number.isFinite(n)) return ARABIC_FONTS.regular;
  if (n >= 700) return ARABIC_FONTS.bold;
  if (n >= 600) return ARABIC_FONTS.semibold;
  if (n >= 500) return ARABIC_FONTS.medium;
  return ARABIC_FONTS.regular;
}

let patched = false;

export function applyArabicFont(): void {
  if (patched) return;
  patched = true;
  for (const Comp of [Text, TextInput] as unknown as { render?: (...a: unknown[]) => React.ReactElement }[]) {
    const original = Comp.render;
    if (typeof original !== "function") continue;
    Comp.render = function patchedRender(...args: unknown[]) {
      const el = original.apply(this, args) as React.ReactElement<{ style?: unknown }>;
      const flat = (StyleSheet.flatten(el.props?.style) || {}) as { fontFamily?: string; fontWeight?: string | number };
      // Respect explicit families (monospace IDs, etc.) — don't Arabize them.
      if (flat.fontFamily) return el;
      return React.cloneElement(el, {
        style: [el.props?.style, { fontFamily: familyForWeight(flat.fontWeight), fontWeight: undefined }],
      });
    };
  }
}
