"use client";

import { useEffect, useState } from "react";
import { useTheme, type ThemeName } from "./ThemeProvider";

const labels: Record<ThemeName, string> = {
  dark: "Cinematico",
  light: "Claro",
  minimal: "Minimal",
};

export function ThemeSwitcher() {
  const { theme, setTheme, options } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 backdrop-blur">
        <span className="font-semibold uppercase tracking-[0.2em] text-white/60">Tema</span>
        <div className="flex gap-1">
          {options.map((option) => (
            <span
              key={option}
              className="rounded-lg px-3 py-1 font-semibold border border-white/10 text-white/60"
            >
              {labels[option]}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 backdrop-blur">
      <span className="font-semibold uppercase tracking-[0.2em] text-white/60">Tema</span>
      <div className="flex gap-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            className={`rounded-lg px-3 py-1 font-semibold transition ${
              theme === option
                ? "bg-cyan-500/20 text-cyan-100 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.35)]"
                : "border border-white/10 text-white/70 hover:border-white/30 hover:text-white"
            }`}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
