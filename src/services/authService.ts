import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AxiosResponse } from "axios";
import { http, setAuthToken, setPortalSid } from "./http";
import { LoginOtpPayload, UserSession, VerifyOtpPayload } from "../types/api";
import { normalizeUserSession } from "../utils/userSession";

const PORTAL_SID_STORAGE = "portal_sid";
const AUTH_TOKEN_STORAGE = "auth_token";

interface VerifyOtpResponse {
  token?: string;
  sessionToken?: string;
  accessToken?: string;
  sid?: string;
  data?: {
    sid?: string;
    message?: { sid?: string };
    session?: { sid?: string };
  };
  message?: { sid?: string };
  session?: { sid?: string };
  user?: UserSession;
}

/** Best-effort: finds first non-empty string at key `sid`, depth max 5. Does not log values. */
function findSidDeep(obj: unknown, depth = 5): string | null {
  if (depth < 0 || obj === null || obj === undefined) return null;
  if (typeof obj === "string") {
    try {
      const parsed: unknown = JSON.parse(obj);
      return findSidDeep(parsed, depth - 1);
    } catch {
      return null;
    }
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findSidDeep(item, depth - 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (k === "sid" && typeof v === "string" && v.trim() !== "") return v;
    }
    for (const k of Object.keys(o)) {
      const found = findSidDeep(o[k], depth - 1);
      if (found) return found;
    }
  }
  return null;
}


function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function extractSidFromKnownShapes(body: Record<string, unknown> | null): string | null {
  if (!body) return null;
  const pick = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : null);

  const data = asRecord(body.data);
  const message = asRecord(body.message) ?? (data ? asRecord(data.message) : null);
  const session = asRecord(body.session) ?? (data ? asRecord(data.session) : null);

  return (
    pick(body.sid) ||
    (data ? pick(data.sid) : null) ||
    (message ? pick(message.sid) : null) ||
    (session ? pick(session.sid) : null) ||
    null
  );
}

/** Optional portal endpoints — ignored if absent. */
async function fetchOptionalMeUser(): Promise<Record<string, unknown>> {
  const merged: Record<string, unknown> = {};

  try {
    const { data } = await http.get<unknown>("/api/auth/me");
    const top = asRecord(data);
    const nested = top ? asRecord(top.data) : null;
    const userObj = (top ? asRecord(top.user) : null) ?? (nested ? asRecord(nested.user) : null);

    if (userObj) {
      merged.user = userObj;
      Object.assign(merged, userObj);
    } else if (top && str(top.user)) {
      merged.email = str(top.user);
      merged.name = str(top.user);
    }
  } catch {
    /* endpoint may not exist on this portal */
  }

  try {
    const { data } = await http.get<unknown>("/api/employee/me");
    const top = asRecord(data);
    const nested = top ? asRecord(top.data) : null;
    const employeeObj = (top ? asRecord(top.employee) : null) ?? (nested ? asRecord(nested.employee) : null);
    const companyObj =
      (top ? asRecord(top.company) : null) ??
      (nested ? asRecord(nested.company) : null) ??
      (employeeObj ? asRecord(employeeObj.company) : null);

    if (employeeObj) {
      merged.employee = employeeObj;
      Object.assign(merged, employeeObj);
    }
    if (companyObj) {
      merged.company = companyObj;
    }
  } catch {
    /* endpoint may not exist on this portal */
  }

  return merged;
}

function normalizeVerifyBody(raw: unknown): { body: Record<string, unknown> | null } {
  if (raw === null || raw === undefined) return { body: null };
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return { body: asRecord(parsed) };
    } catch {
      return { body: null };
    }
  }
  if (typeof raw === "object") return { body: asRecord(raw) };
  return { body: null };
}

export const authService = {
  // Mobile app reuses existing portal-api auth contracts (no backend changes).
  sendOtp(payload: LoginOtpPayload) {
    return http.post("/api/auth/request-otp", payload);
  },
  async verifyOtp(payload: VerifyOtpPayload) {
    const axiosResponse: AxiosResponse<VerifyOtpResponse> = await http.post<VerifyOtpResponse>(
      "/api/auth/verify-otp",
      payload
    );

    const rawData = axiosResponse.data;
    const { body } = normalizeVerifyBody(rawData);

    const messageObj = body ? asRecord(body.message) : null;
    const sessionObj = body ? asRecord(body.session) : null;
    const nestedData = body ? asRecord(body.data) : null;
    const messageFromNested = nestedData ? asRecord(nestedData.message) : null;
    const sessionFromNested = nestedData ? asRecord(nestedData.session) : null;

    const sidKnown = extractSidFromKnownShapes(body);
    const sidFromDataDeep = findSidDeep(rawData);
    const sidFromAxiosDeep = findSidDeep(axiosResponse);

    const sid = sidKnown || sidFromDataDeep || sidFromAxiosDeep || null;

    // The BFF establishes the session as an httpOnly `portal_sid` cookie; the ERP
    // sid is intentionally NOT exposed in the response body (security model). A 2xx
    // response here means verification succeeded and the session cookie was set, so
    // the native cookie jar (withCredentials) authorizes subsequent requests. Persist
    // the sid only when present (belt-and-suspenders for the X-Portal-SID header);
    // never fail login just because the body omits it.
    if (sid) {
      await AsyncStorage.setItem(PORTAL_SID_STORAGE, sid);
      setPortalSid(sid);
    }

    const token =
      (typeof body?.token === "string" ? body.token : null) ||
      (typeof body?.sessionToken === "string" ? body.sessionToken : null) ||
      (typeof body?.accessToken === "string" ? body.accessToken : null) ||
      (nestedData && typeof nestedData.token === "string" ? nestedData.token : null) ||
      (nestedData && typeof nestedData.sessionToken === "string" ? nestedData.sessionToken : null) ||
      (nestedData && typeof nestedData.accessToken === "string" ? nestedData.accessToken : null) ||
      null;

    if (token) {
      setAuthToken(token);
      await AsyncStorage.setItem(AUTH_TOKEN_STORAGE, token);
    }

    const rawTop = asRecord(rawData);
    let userRaw: unknown =
      body?.user ??
      nestedData?.user ??
      rawTop?.user ??
      null;
    if (userRaw == null || typeof userRaw !== "object") {
      userRaw = {};
    }

    const me = await fetchOptionalMeUser();
    if (Object.keys(me).length > 0) {
      userRaw = { ...asRecord(userRaw), ...me };
    }

    const user = normalizeUserSession(userRaw, payload);

    return {
      token,
      sid,
      user,
    };
  },
};
