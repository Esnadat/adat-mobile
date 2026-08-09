const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!baseUrl) {
  throw new Error("EXPO_PUBLIC_API_BASE_URL is required");
}

// privacyUrl/termsUrl point at the live public portal pages. Domain will move
// to adathr.com once the transition completes; override via EXPO_PUBLIC_* env.
// supportEmail is the real, monitored mailbox (same as the Privacy Policy);
// the production build also sets it explicitly via EXPO_PUBLIC_SUPPORT_EMAIL.
export const ENV = {
  apiBaseUrl: baseUrl,
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL || "https://portal.esnadat.sa/privacy",
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL || "https://portal.esnadat.sa/terms",
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "support@adathr.com",
};
