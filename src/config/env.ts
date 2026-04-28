const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!baseUrl) {
  throw new Error("EXPO_PUBLIC_API_BASE_URL is required");
}

export const ENV = {
  apiBaseUrl: baseUrl,
};
