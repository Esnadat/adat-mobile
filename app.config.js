// Dynamic Expo config: keeps app.json as the source of truth and injects the Google
// Maps Android API key from the environment at build time (EAS secret
// GOOGLE_MAPS_ANDROID_KEY). The key is NEVER stored in the repo. When the env var is
// absent (local dev), the key is simply omitted — the build still works, only the
// Android map tiles won't render. iOS uses Apple Maps (no key).
const base = require("./app.json");

module.exports = () => {
  const expo = { ...base.expo };
  const androidKey = process.env.GOOGLE_MAPS_ANDROID_KEY;
  return {
    ...expo,
    android: {
      ...(expo.android || {}),
      config: {
        ...((expo.android && expo.android.config) || {}),
        ...(androidKey ? { googleMaps: { apiKey: androidKey } } : {}),
      },
    },
  };
};
