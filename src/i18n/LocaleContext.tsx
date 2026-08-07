import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { I18nManager } from "react-native";
import { i18n, LOCALE_STORAGE_KEY } from "./index";

export type AppLocale = "ar" | "en";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (next: AppLocale) => void;
  /** `true` after storage has been read (or failed). */
  ready: boolean;
};

const Ctx = createContext<LocaleContextValue | undefined>(undefined);

function applyLocale(next: AppLocale) {
  i18n.locale = next;
  I18nManager.allowRTL(next === "ar");
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("ar");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
        if (raw === "en") {
          applyLocale("en");
          setLocaleState("en");
        } else {
          applyLocale("ar");
          setLocaleState("ar");
        }
      } catch {
        applyLocale("ar");
        setLocaleState("ar");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    applyLocale(next);
    void AsyncStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, ready }),
    [locale, setLocale, ready]
  );

  if (!ready) {
    return null;
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppLocale() {
  const c = useContext(Ctx);
  if (!c) {
    throw new Error("useAppLocale must be used within LocaleProvider");
  }
  return c;
}
