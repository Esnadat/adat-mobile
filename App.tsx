import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { LocaleProvider } from "./src/i18n/LocaleContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { OfflineBanner } from "./src/components/ui/OfflineBanner";

export default function App() {
  return (
    <SafeAreaProvider>
      <LocaleProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <AppNavigator />
            <OfflineBanner />
          </NavigationContainer>
        </AuthProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}
