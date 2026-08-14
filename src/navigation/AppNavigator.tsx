import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useAppLocale } from "../i18n/LocaleContext";
import { LoginScreen } from "../screens/LoginScreen";
import { TabNavigator } from "./TabNavigator";
import { DayDetailScreen } from "../screens/DayDetailScreen";
import { RequestDetailScreen } from "../screens/RequestDetailScreen";
import { TeamMemberScreen } from "../screens/TeamMemberScreen";
import { AboutScreen } from "../screens/AboutScreen";
import { colors } from "../theme/colors";
import { RootStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { user, loading } = useAuth();
  const { locale } = useAppLocale();
  const isAr = locale === "ar";

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={locale}
      screenOptions={{
        headerShown: false,
        // Push horizontally in the reading direction (RTL slides from the left),
        // with swipe-back enabled — a book-like feel per the K360 reference.
        animation: isAr ? "slide_from_left" : "slide_from_right",
        gestureEnabled: true,
      }}
    >
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="DayDetail" component={DayDetailScreen} />
          <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
          <Stack.Screen name="TeamMember" component={TeamMemberScreen} />
          <Stack.Screen name="About" component={AboutScreen} options={{ presentation: "modal" }} />
        </>
      )}
    </Stack.Navigator>
  );
}
