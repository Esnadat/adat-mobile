import React, { useRef } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "./ui/NavIcons";
import { EmployeeAvatar } from "./ui/EmployeeAvatar";
import { useAuth } from "../context/AuthContext";
import { useAppLocale } from "../i18n/LocaleContext";
import { i18n } from "../i18n";
import { colors } from "../theme/colors";

export type DrawerDestination = "profile" | "businessCard" | "support" | "settings";

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigate: (dest: DrawerDestination) => void;
}

/**
 * Slide-in app menu (the "hamburger" drawer). Reuses the app's existing menu
 * destinations — one menu, not a second competing hub. Logout lives here.
 */
export function AppDrawer({ visible, onClose, onNavigate }: Props) {
  const { locale } = useAppLocale();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const isAr = locale === "ar";
  const slide = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      slide.setValue(0);
      Animated.timing(slide, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [visible, slide]);

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [isAr ? 320 : -320, 0],
  });

  const go = (dest: DrawerDestination) => {
    onClose();
    // Let the modal dismiss before switching content.
    setTimeout(() => onNavigate(dest), 60);
  };

  const items: { dest: DrawerDestination; icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }[] = [
    { dest: "profile", icon: "person-outline", label: i18n.t("profileTab") },
    { dest: "businessCard", icon: "id-card-outline", label: i18n.t("moreBusinessCard") },
    { dest: "support", icon: "help-buoy-outline", label: i18n.t("support") },
    { dest: "settings", icon: "settings-outline", label: i18n.t("moreSettings") },
  ];

  const displayName = user?.name || user?.email || "";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={i18n.t("close")}>
        <Animated.View
          style={[
            styles.panel,
            isAr ? styles.panelEnd : styles.panelStart,
            { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18, transform: [{ translateX }] },
          ]}
          // Prevent backdrop press from firing when tapping inside the panel.
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.header, isAr && styles.rowReverse]}>
            <EmployeeAvatar photoUrl={user?.employeePhotoUrl ?? null} initialSource={displayName} size={46} />
            <View style={styles.headerText}>
              <Text style={[styles.name, isAr && styles.rtl]} numberOfLines={1}>{displayName}</Text>
              {user?.designation ? (
                <Text style={[styles.sub, isAr && styles.rtl]} numberOfLines={1}>{user.designation}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.items}>
            {items.map((it) => (
              <Pressable key={it.dest} style={({ pressed }) => [styles.item, isAr && styles.rowReverse, pressed && styles.itemPressed]} onPress={() => go(it.dest)}>
                <Ionicons name={it.icon} size={20} color={colors.textSecondary} />
                <Text style={[styles.itemText, isAr && styles.rtl]}>{it.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.logout, isAr && styles.rowReverse, pressed && styles.itemPressed]}
            onPress={() => {
              onClose();
              setTimeout(() => void logout(), 60);
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[styles.logoutText, isAr && styles.rtl]}>{i18n.t("logout")}</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  rowReverse: { flexDirection: "row-reverse" },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  panel: { position: "absolute", top: 0, bottom: 0, width: 300, backgroundColor: colors.surface, paddingHorizontal: 18 },
  panelStart: { start: 0, borderTopEndRadius: 20, borderBottomEndRadius: 20 },
  panelEnd: { end: 0, borderTopStartRadius: 20, borderBottomStartRadius: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerText: { flex: 1 },
  name: { fontSize: 16, fontWeight: "800", color: colors.ink },
  sub: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  items: { flex: 1, paddingTop: 12 },
  item: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  itemPressed: { opacity: 0.6 },
  itemText: { fontSize: 15, fontWeight: "600", color: colors.ink },
  logout: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  logoutText: { fontSize: 15, fontWeight: "700", color: colors.danger },
});
