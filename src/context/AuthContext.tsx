import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { setAuthToken, setPortalSid } from "../services/http";
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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

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
        const session = await authService.verifyOtp(payload);

        await AsyncStorage.setItem(SID_KEY, session.sid);
        setPortalSid(session.sid);
        const hasSidAfterStore = Boolean(await AsyncStorage.getItem(SID_KEY));

        if (!hasSidAfterStore) {
          await AsyncStorage.removeItem(SID_KEY);
          setPortalSid(null);
          throw new Error("Login succeeded but session was not returned");
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
