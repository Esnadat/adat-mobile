import axios from "axios";
import { AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

let authToken: string | null = null;
let portalSid: string | null = null;
const SID_KEY = "portal_sid";
const DEBUG_MOBILE_API = false;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const setPortalSid = (sid: string | null) => {
  portalSid = sid;
};

export const http = axios.create({
  baseURL: "https://portal.esnadat.sa",
  withCredentials: true,
  headers: {
    Origin: "https://portal.esnadat.sa",
    Referer: "https://portal.esnadat.sa/",
    "X-Requested-With": "esnadat-mobile",
  },
});

http.interceptors.request.use(async (config) => {
  const sidFromStorage = await AsyncStorage.getItem(SID_KEY);
  portalSid = sidFromStorage || null;
  config.headers = config.headers || {};

  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  if (portalSid) {
    config.headers["X-Portal-SID"] = portalSid;
  }
  if (__DEV__ && DEBUG_MOBILE_API) {
    console.log("[mobile-api] request", { method: config.method, url: config.url, hasSid: Boolean(portalSid) });
  }
  return config;
});

export function getApiErrorMessage(error: unknown): string {
  const fallback = "Request failed";
  if (!(error instanceof AxiosError)) {
    if (error instanceof Error && error.message.trim()) return error.message;
    return fallback;
  }

  const payload = error.response?.data as
    | { message?: unknown; error?: unknown; details?: { message?: unknown } }
    | string
    | undefined;

  if (typeof payload === "string" && payload.trim()) return payload;
  if (payload && typeof payload === "object") {
    if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
    if (payload.details && typeof payload.details.message === "string" && payload.details.message.trim()) {
      return payload.details.message;
    }
  }
  if (error.message.trim()) return error.message;
  return fallback;
}

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = String(error.config?.url || "");
    const method = error.config?.method;
    const isOptionalUserEnrichment404 =
      status === 404 && (url.includes("/api/auth/me") || url.includes("/api/employee/me"));

    if (__DEV__) {
      if (isOptionalUserEnrichment404) {
        // Optional enrichment endpoints may be unavailable on some portals.
        console.log("[mobile-api] optional endpoint unavailable", { status, url, method });
      } else {
        console.error("[mobile-api] request failed", { status, url, method });
      }
    }
    return Promise.reject(error);
  }
);
