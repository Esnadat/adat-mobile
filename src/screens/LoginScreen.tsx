import { AxiosError } from "axios";
import React, { useState } from "react";
import {
  Image,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { LargeButton } from "../components/LargeButton";
import { useAppLocale } from "../i18n/LocaleContext";
import { i18n } from "../i18n";
import { colors } from "../theme/colors";
import { ENV } from "../config/env";
import { shadowCard } from "../theme/shadows";
import { getApiErrorMessage } from "../services/http";

const brandLogo = require("../../assets/branding/adat-logo.png");

function humanizeLoginError(error: unknown): string {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    if (status === 401) return i18n.t("errUnauthorized");
    if (status === 404) return i18n.t("errNotFound");
    if (status != null && status >= 500) return i18n.t("errServer");
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      return i18n.t("errNetwork");
    }
  }
  const raw = getApiErrorMessage(error);
  if (raw.length < 200 && !/^Request failed/i.test(raw)) {
    return raw;
  }
  return i18n.t("errGeneric");
}

export function LoginScreen() {
  const { sendOtp, verifyOtp } = useAuth();
  const { locale, setLocale } = useAppLocale();
  const [languageTick, setLanguageTick] = useState(0);
  const [companyCode, setCompanyCode] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAr = locale === "ar";

  const toggleLanguage = () => {
    const next = isAr ? "en" : "ar";
    setLocale(next);
    I18nManager.allowRTL(next === "ar");
    setLanguageTick((v) => v + 1);
  };

  const handleSendOtp = async () => {
    setError(null);
    if (!companyCode.trim() || !email.trim()) {
      setError(i18n.t("valCompanyEmail"));
      return;
    }
    setLoading(true);
    try {
      await sendOtp({ companyCode: companyCode.trim(), email: email.trim() });
      setIsOtpStep(true);
    } catch (e) {
      setError(humanizeLoginError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    if (!otp.trim()) {
      setError(i18n.t("valOtp"));
      return;
    }
    setLoading(true);
    try {
      await verifyOtp({ companyCode: companyCode.trim(), email: email.trim(), otp: otp.trim() });
    } catch (e) {
      setError(humanizeLoginError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandSection} key={`brand-${languageTick}`}>
          <Image source={brandLogo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.subtitle}>{i18n.t("appSubtitle")}</Text>
        </View>

        <View style={styles.card}>
          {!isOtpStep ? (
            <>
              <Text style={styles.inputLabel} key={`lbl1-${languageTick}`}>
                {i18n.t("companyCode")}
              </Text>
              <TextInput
                value={companyCode}
                onChangeText={setCompanyCode}
                style={styles.input}
                placeholder={isAr ? "مثال: 1001" : "e.g. 1001"}
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                returnKeyType="next"
              />

              <Text style={styles.inputLabel} key={`lbl2-${languageTick}`}>
                {i18n.t("email")}
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholder={isAr ? "name@company.com" : "you@company.com"}
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
              />

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <LargeButton
                title={i18n.t("sendOtp")}
                onPress={handleSendOtp}
                loading={loading}
              />
            </>
          ) : (
            <>
              <Text style={styles.formTitle} key={`ft2-${languageTick}`}>
                {i18n.t("otpCode")}
              </Text>

              <View style={styles.otpHintRow}>
                <Text style={styles.otpHintLabel} key={`ohl-${languageTick}`}>
                  {i18n.t("otpSentTo")}
                </Text>
                <Text style={styles.otpHintEmail} numberOfLines={1}>
                  {" "}
                  {email}
                </Text>
              </View>

              <TextInput
                value={otp}
                onChangeText={setOtp}
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={8}
                returnKeyType="done"
                onSubmitEditing={handleVerify}
                autoFocus
              />

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <LargeButton
                title={i18n.t("verifyOtp")}
                onPress={handleVerify}
                loading={loading}
              />

              <Pressable
                style={styles.backLink}
                onPress={() => {
                  setIsOtpStep(false);
                  setOtp("");
                  setError(null);
                }}
              >
                <Text style={styles.backLinkText} key={`blt-${languageTick}`}>
                  {i18n.t("changeEmail")}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <Pressable style={styles.langRow} onPress={toggleLanguage}>
          <Text style={styles.langText} key={`lang-${languageTick}`}>
            {i18n.t("language")}
          </Text>
        </Pressable>

        <View style={styles.legalRow}>
          <Text style={styles.legalLink} onPress={() => Linking.openURL(ENV.privacyUrl)}>
            {i18n.t("privacyPolicy")}
          </Text>
          <Text style={styles.legalDot}>{"\u00B7"}</Text>
          <Text style={styles.legalLink} onPress={() => Linking.openURL(ENV.termsUrl)}>
            {i18n.t("termsOfService")}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 52,
  },
  brandSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 210,
    height: 80,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 26,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    ...shadowCard,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.12)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16,
    fontSize: 16,
    color: colors.text,
  },
  otpInput: {
    textAlign: "center",
    fontSize: 26,
    letterSpacing: 8,
    fontWeight: "700",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  otpHintRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  otpHintLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  otpHintEmail: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
    flexShrink: 1,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  backLink: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  backLinkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  langRow: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  legalRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 12 },
  legalLink: { color: colors.textMuted ?? "#6B7280", fontSize: 12, textDecorationLine: "underline" },
  legalDot: { color: colors.textMuted ?? "#6B7280", fontSize: 12 },
  langText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
});
