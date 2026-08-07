import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

/** Shared in-card section chrome for Employee Home (Dashboard) blocks. */
export const homeSectionStyles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.15,
    marginBottom: 8,
  },
  card: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  loadingRow: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
