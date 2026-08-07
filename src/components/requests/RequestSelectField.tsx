import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../../theme/colors";

export type RequestSelectOption = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  options: RequestSelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  isAr: boolean;
};

export function RequestSelectField({
  label,
  value,
  options,
  onValueChange,
  placeholder,
  error,
  isAr,
}: Props) {
  const [open, setOpen] = useState(false);
  const textAlign = isAr ? "right" : "left";
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { textAlign }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          error ? styles.fieldError : null,
          pressed && styles.fieldPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text
          style={[styles.valueText, !selected && styles.placeholder, { textAlign }]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder ?? ""}
        </Text>
        <Text style={[styles.chev, isAr && styles.chevAr]} allowFontScaling={false}>
          ›
        </Text>
      </Pressable>
      {error ? (
        <Text style={[styles.error, { textAlign }]}>{error}</Text>
      ) : null}

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, isAr && styles.sheetAr]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { textAlign }]}>{label}</Text>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {options.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={({ pressed }) => [
                    styles.optionRow,
                    opt.value === value && styles.optionRowActive,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, { textAlign }]}>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Text style={styles.closeBtnText}>{isAr ? "إغلاق" : "Close"}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fieldError: { borderColor: colors.danger },
  fieldPressed: { opacity: 0.92 },
  valueText: { flex: 1, fontSize: 14, color: colors.text },
  placeholder: { color: colors.muted },
  chev: { fontSize: 22, color: colors.muted, transform: [{ rotate: "90deg" }] },
  chevAr: { transform: [{ rotate: "-90deg" }] },
  error: { marginTop: 6, fontSize: 12, color: colors.danger, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    maxHeight: "55%",
  },
  sheetAr: {},
  sheetTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 10,
  },
  list: { maxHeight: 360 },
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  optionRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionPressed: { opacity: 0.9 },
  optionText: { fontSize: 14, fontWeight: "800", color: colors.text },
  closeBtn: {
    marginTop: 6,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  closeBtnText: { fontSize: 14, fontWeight: "900", color: colors.primary },
});
