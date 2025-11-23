"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

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
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);

useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    const next = stored ?? DEFAULT_THEME;
    document.documentElement.setAttribute("data-theme", next);
    setThemeState(next);
  }, []);

  const setTheme = (value: ThemeName) => {
    setThemeState(value);
    document.documentElement.setAttribute("data-theme", value);
    window.localStorage.setItem(STORAGE_KEY, value);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, options: ["dark", "light", "minimal"] }),
    [theme],
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
