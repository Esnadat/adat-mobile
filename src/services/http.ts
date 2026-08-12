import axios from "axios";
import { AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENV } from "../config/env";

/** Single source of truth for the API host (enables the adathr.com migration via env). */
const API_ORIGIN = ENV.apiBaseUrl.replace(/\/+$/, "");

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

/**
 * Registered by AuthContext. Called when an authenticated request returns 401
 * (session expired/invalid) so the app can clear local login state and route to
 * the sign-in screen instead of showing a broken logged-in UI. OTP login calls
 * are excluded (their 401s are login errors, not session expiry).
 */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export const http = axios.create({
  baseURL: API_ORIGIN,
  withCredentials: true,
  headers: {
    Origin: API_ORIGIN,
    Referer: `${API_ORIGIN}/`,
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

    const isOtpAuthCall =
      url.includes("/api/auth/request-otp") ||
      url.includes("/api/auth/verify-otp") ||
      url.includes("/api/auth/send-code") ||
      url.includes("/api/auth/request-code") ||
      url.includes("/api/auth/verify");
    if (status === 401 && !isOtpAuthCall) {
      // Session expired/invalid on an authenticated request → let AuthContext sign out.
      try {
        onUnauthorized?.();
      } catch {
        /* ignore */
      }
    }

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
