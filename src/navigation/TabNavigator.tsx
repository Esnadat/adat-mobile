import React, { useEffect, useState } from "react";
import { I18nManager, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, type RouteProp } from "@react-navigation/native";
import {
  Ionicons,
  NavCalendarIcon,
  NavDocumentIcon,
  NavGridIcon,
} from "../components/ui/NavIcons";
import { AttendanceScreen } from "../screens/AttendanceScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { PayrollScreen } from "../screens/PayrollScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RequestsHubScreen } from "../screens/RequestsHubScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { BusinessCardScreen } from "../screens/BusinessCardScreen";
import { TasksScreen } from "../screens/TasksScreen";
import { MyBalancesScreen } from "../screens/MyBalancesScreen";
import { MyTeamScreen } from "../screens/MyTeamScreen";
import { MonthlyStatementScreen } from "../screens/MonthlyStatementScreen";
import { AppDrawer, type DrawerDestination } from "../components/AppDrawer";
import { DrawerContext } from "../context/DrawerContext";
import { useAppLocale } from "../i18n/LocaleContext";
import { i18n } from "../i18n";
import { colors } from "../theme/colors";
import { floatingTabBarBottomInset } from "../theme/shadows";
import { MoreStackView, RootStackParamList, TabId } from "../types/navigation";

interface TabConfig {
  id: TabId;
  labelKey: string;
  titleKey: string;
  icon: (active: boolean) => React.ReactNode;
}

const TABS: TabConfig[] = [
  {
    id: "tasks",
    labelKey: "tasksTab",
    titleKey: "tasksTab",
    icon: (a) => (
      <Ionicons
        name={a ? "checkbox" : "checkbox-outline"}
        size={22}
        color={a ? colors.successDark : colors.textMuted}
      />
    ),
  },
  {
    id: "requests",
    labelKey: "requestsTab",
    titleKey: "requestsTab",
    icon: (a) => <NavDocumentIcon active={a} />,
  },
  {
    id: "attendance",
    labelKey: "home",
    titleKey: "home",
    icon: (a) => (
      <Ionicons
        name={a ? "home" : "home-outline"}
        size={22}
        color={a ? colors.successDark : colors.textMuted}
      />
    ),
  },
  {
    id: "calendar",
    labelKey: "calendarTab",
    titleKey: "calendarTitle",
    icon: (a) => <NavCalendarIcon active={a} />,
  },
  {
    id: "more",
    labelKey: "moreTab",
    titleKey: "moreTitle",
    icon: (a) => <NavGridIcon active={a} />,
  },
];

export function TabNavigator() {
  const { locale } = useAppLocale();
  const route = useRoute<RouteProp<RootStackParamList, "Main">>();
  const [activeTab, setActiveTab] = useState<TabId>("attendance");
  const [moreStackView, setMoreStackView] = useState<MoreStackView | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const isAr = locale === "ar";

  const onDrawerNavigate = (dest: DrawerDestination) => {
    if (dest === "profile") setMoreStackView("profile");
    else if (dest === "businessCard") setMoreStackView("businessCard");
    else if (dest === "settings") setMoreStackView("settings");
    else if (dest === "support") goTab("requests"); // support lives in the Requests hub
  };

  // Deep-link into a specific tab (e.g. from a notification).
  const requestedTab = route.params?.tab;
  useEffect(() => {
    if (requestedTab) {
      setMoreStackView(null);
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);
  const tabRowDir: "row" | "row-reverse" = isAr
    ? I18nManager.isRTL
      ? "row"
      : "row-reverse"
    : "row";

  const goTab = (id: TabId) => {
    setMoreStackView(null);
    setActiveTab(id);
  };

  return (
    <View style={styles.root} key={locale}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      {moreStackView ? (
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerCard}>
            <View style={styles.headerGlow} />
            <View style={styles.headerRow}>
              <View style={styles.headerSide}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={i18n.t("back")}
                  onPress={() => setMoreStackView(null)}
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  style={styles.backBtn}
                >
                  <Ionicons name={isAr ? "chevron-forward" : "chevron-back"} size={24} color={colors.ink} />
                </TouchableOpacity>
              </View>
              <Text style={styles.headerTitle}>
                {moreStackView === "payroll"
                  ? i18n.t("payrollTab")
                  : moreStackView === "businessCard"
                    ? locale === "ar"
                      ? "بطاقة العمل"
                      : "Business Card"
                    : moreStackView === "notifications"
                      ? locale === "ar"
                        ? "التنبيهات"
                        : "Notifications"
                      : moreStackView === "balances"
                        ? locale === "ar"
                          ? "أرصدتي"
                          : "My Balances"
                        : moreStackView === "team"
                          ? locale === "ar"
                            ? "فريقي"
                            : "My Team"
                          : moreStackView === "statement"
                            ? i18n.t("stmtTitle")
                            : moreStackView === "profile"
                              ? i18n.t("profileTab")
                              : i18n.t("settingsTitle")}
              </Text>
              <View style={styles.headerSide} />
            </View>
          </View>
        </View>
      ) : (
        <View style={{ height: insets.top, backgroundColor: colors.surface }} />
      )}

      <View style={styles.bodyColumn}>
        <View
          style={[
            styles.screenArea,
            moreStackView ? { paddingBottom: Math.max(insets.bottom, 16) + 8 } : null,
          ]}
        >
          {moreStackView === "payroll" ? (
            <View style={styles.screen}>
              <PayrollScreen />
            </View>
          ) : moreStackView === "businessCard" ? (
            <View style={styles.screen}>
              <BusinessCardScreen />
            </View>
          ) : moreStackView === "settings" ? (
            <View style={styles.screen}>
              <SettingsScreen />
            </View>
          ) : moreStackView === "balances" ? (
            <View style={styles.screen}>
              <MyBalancesScreen />
            </View>
          ) : moreStackView === "team" ? (
            <View style={styles.screen}>
              <MyTeamScreen />
            </View>
          ) : moreStackView === "statement" ? (
            <View style={styles.screen}>
              <MonthlyStatementScreen />
            </View>
          ) : moreStackView === "profile" ? (
            <View style={styles.screen}>
              <ProfileScreen />
            </View>
          ) : (
            <DrawerContext.Provider value={{ openDrawer: () => setDrawerOpen(true) }}>
              <View style={[styles.screen, { display: activeTab === "tasks" ? "flex" : "none" }]}>
                <TasksScreen />
              </View>
              <View style={[styles.screen, { display: activeTab === "requests" ? "flex" : "none" }]}>
                <RequestsHubScreen />
              </View>
              <View style={[styles.screen, { display: activeTab === "attendance" ? "flex" : "none" }]}>
                <AttendanceScreen
                  onGoRequests={() => goTab("requests")}
                  onGoCalendar={() => goTab("calendar")}
                  onGoProfile={() => setMoreStackView("profile")}
                  onOpenPayroll={() => setMoreStackView("payroll")}
                />
              </View>
              <View style={[styles.screen, { display: activeTab === "calendar" ? "flex" : "none" }]}>
                <CalendarScreen />
              </View>
              <View style={[styles.screen, { display: activeTab === "more" ? "flex" : "none" }]}>
                <MoreScreen
                  onOpenPayroll={() => setMoreStackView("payroll")}
                  onOpenSettings={() => setMoreStackView("settings")}
                  onOpenBusinessCard={() => setMoreStackView("businessCard")}
                  onOpenNotifications={() => setMoreStackView("notifications")}
                  onOpenBalances={() => setMoreStackView("balances")}
                  onOpenTeam={() => setMoreStackView("team")}
                  onOpenStatement={() => setMoreStackView("statement")}
                />
              </View>
            </DrawerContext.Provider>
          )}
        </View>

        {!moreStackView ? (
          <View
            style={[
              styles.tabBar,
              {
                paddingBottom: Math.max(insets.bottom, 4),
                minHeight: Math.max(floatingTabBarBottomInset, insets.bottom + 50),
                borderTopColor: colors.divider,
              },
            ]}
          >
            <View style={[styles.tabRow, { flexDirection: tabRowDir }]}>
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.tabHit, active && styles.tabHitActive]}
                    onPress={() => goTab(tab.id)}
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    {tab.icon(active)}
                    <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
                      {i18n.t(tab.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>

      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} onNavigate={onDrawerNavigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bodyColumn: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(13, 138, 78, 0.11)",
    top: -62,
    right: -28,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  headerSide: {
    width: 72,
    justifyContent: "center",
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginStart: -8,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.2,
  },
  screenArea: {
    flex: 1,
    minHeight: 0,
    zIndex: 0,
  },
  screen: {
    flex: 1,
    minHeight: 0,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 5,
    paddingHorizontal: 8,
    zIndex: 20,
    elevation: 10,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  tabHit: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 10,
    gap: 3,
    alignSelf: "stretch",
  },
  tabHitActive: {
    backgroundColor: colors.successLight,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 12,
    maxWidth: 76,
  },
  tabLabelActive: {
    color: colors.successDark,
    fontWeight: "800",
  },
});
