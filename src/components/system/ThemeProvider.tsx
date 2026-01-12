"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";

export type ThemeName = "dark" | "light" | "minimal";

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (value: ThemeName) => void;
  options: ThemeName[];
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "asistencia-theme";
const DEFAULT_THEME: ThemeName = "dark";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isKiosk = pathname?.startsWith("/terminal");
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isKiosk) {
      setThemeState(DEFAULT_THEME);
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    if (stored && stored !== theme) {
      setThemeState(stored);
    }
  }, [isKiosk, theme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const effective = isKiosk ? DEFAULT_THEME : theme;
    document.documentElement.setAttribute("data-theme", effective);
    if (!isKiosk) {
      window.localStorage.setItem(STORAGE_KEY, effective);
    }
  }, [isKiosk, theme]);

  const setTheme = useCallback(
    (value: ThemeName) => {
      if (isKiosk) return;
      setThemeState(value);
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", value);
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, value);
      }
    },
    [isKiosk],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: isKiosk ? DEFAULT_THEME : theme,
      setTheme,
      options: ["dark", "light", "minimal"],
    }),
    [isKiosk, setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
};
