const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!baseUrl) {
  throw new Error("EXPO_PUBLIC_API_BASE_URL is required");
}

// NOTE: privacyUrl/termsUrl/supportEmail are placeholders — set the real
// published links via EXPO_PUBLIC_* env before store submission.
export const ENV = {
  apiBaseUrl: baseUrl,
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL || "https://esnadat.sa/privacy",
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL || "https://esnadat.sa/terms",
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "support@esnadat.sa",
};
