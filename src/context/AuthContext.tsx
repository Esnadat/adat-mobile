import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { authService } from "../services/authService";
import { setAuthToken, setPortalSid, setUnauthorizedHandler } from "../services/http";
import { LoginOtpPayload, UserSession, VerifyOtpPayload } from "../types/api";

const TOKEN_KEY = "auth_token";
const SID_KEY = "portal_sid";
const USER_KEY = "auth_user";

interface AuthContextValue {
  user: UserSession | null;
  loading: boolean;
  sendOtp: (payload: LoginOtpPayload) => Promise<void>;
  verifyOtp: (payload: VerifyOtpPayload) => Promise<void>;
  logout: () => Promise<void>;
  /** Update the session photo URL after a successful upload (single source for header/card/profile). */
  updatePhotoUrl: (url: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Mirror the user in a ref so the (stable) 401 handler can tell whether we are
  // actually logged in — avoids a logout being triggered by 401s during login.
  const userRef = useRef<UserSession | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!userRef.current) return;
      setUser(null);
      setAuthToken(null);
      setPortalSid(null);
      void AsyncStorage.multiRemove([TOKEN_KEY, SID_KEY, USER_KEY]);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [token, sid, userRaw] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(SID_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (token) setAuthToken(token);
        if (sid) setPortalSid(sid);
        if (userRaw) setUser(JSON.parse(userRaw));
      } finally {
        setLoading(false);
      }
    };
    void restoreSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      sendOtp: async (payload) => {
        await authService.sendOtp(payload);
      },
      verifyOtp: async (payload) => {
        // A resolved verify (HTTP 2xx) means the session was created; the ERP sid
        // lives in the httpOnly `portal_sid` cookie (not the body). Persist the sid
        // only when the BFF exposes it; otherwise rely on the cookie for auth.
        const session = await authService.verifyOtp(payload);

        if (session.sid) {
          await AsyncStorage.setItem(SID_KEY, session.sid);
          setPortalSid(session.sid);
        } else {
          await AsyncStorage.removeItem(SID_KEY);
          setPortalSid(null);
        }

        if (session.token) {
          await AsyncStorage.setItem(TOKEN_KEY, session.token);
          setAuthToken(session.token);
        }
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(session.user));
        setUser(session.user);
      },
      logout: async () => {
        setUser(null);
        setAuthToken(null);
        setPortalSid(null);
        await AsyncStorage.multiRemove([TOKEN_KEY, SID_KEY, USER_KEY]);
      },
      updatePhotoUrl: (url: string) => {
        setUser((prev) => {
          if (!prev) return prev;
          const next = { ...prev, employeePhotoUrl: url };
          void AsyncStorage.setItem(USER_KEY, JSON.stringify(next));
          return next;
        });
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
