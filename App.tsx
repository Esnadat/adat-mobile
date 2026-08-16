import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";
import { useFonts } from "expo-font";
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from "@expo-google-fonts/ibm-plex-sans-arabic";
import { AuthProvider } from "./src/context/AuthContext";
import { LocaleProvider } from "./src/i18n/LocaleContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { OfflineBanner } from "./src/components/ui/OfflineBanner";
import { applyArabicFont } from "./src/theme/arabicFont";
import { colors } from "./src/theme/colors";

// Patch Text/TextInput to use IBM Plex Sans Arabic (reliable Arabic shaping) before render.
applyArabicFont();

export default function App() {
  const [fontsLoaded] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  // Block first paint until the Arabic font is ready, so text never renders once in the
  // broken system font and then swaps.
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

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
