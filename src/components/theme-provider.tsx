"use client";

import { createContext, useContext, useEffect, useState } from "react";

import type { ThemeName } from "@/types";
import {
  DEFAULT_THEME,
  ENABLE_THEME_SWITCHER,
  themeOptions,
  type ThemeConfigSource,
} from "@/lib/themeConfig";

interface IThemeContext {
  theme: ThemeName;
  source: ThemeConfigSource;
  options: typeof themeOptions;
  handleThemeChange: (nextTheme: ThemeName) => void;
  enableSwitcher: boolean;
}

const ThemeContext = createContext<IThemeContext | null>(null);

const STORAGE_KEY = "react-blog-theme";

interface IThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: IThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_THEME;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && themeOptions.some((option) => option.name === stored)) {
      return stored as ThemeName;
    }

    return DEFAULT_THEME;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function handleThemeChange(nextTheme: ThemeName) {
    if (!themeOptions.some((option) => option.name === nextTheme)) return;
    setTheme(nextTheme);

    if (ENABLE_THEME_SWITCHER && typeof window !== "undefined") {
      void fetch("/api/theme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ theme: nextTheme }),
      }).catch(() => {
        // Swallow errors; client-side theme is still applied via localStorage.
      });
    }
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        source: (process.env.NEXT_PUBLIC_THEME_SOURCE as ThemeConfigSource) === "public" ? "public" : "local",
        options: themeOptions,
        handleThemeChange,
        enableSwitcher: ENABLE_THEME_SWITCHER,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
