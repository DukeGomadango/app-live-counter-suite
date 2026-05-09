"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  isLightMode: boolean;
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_STORAGE_KEY = "app-theme-mode";
const LEGACY_KEYS = [
  "counter-light-mode",
  "slot-light-mode",
  "gacha-light-mode",
  "roulette-light-mode",
  "calculator-light-mode",
  "panel-light-mode",
  "lp-light-mode",
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "dark";
    
    // 1. Check unified key
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved as ThemeMode;
    
    // 2. Migration from legacy keys
    for (const key of LEGACY_KEYS) {
      const legacyVal = localStorage.getItem(key);
      if (legacyVal === "true") {
        localStorage.setItem(THEME_STORAGE_KEY, "light");
        return "light";
      }
    }
    
    // 3. System preference fallback
    if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
    
    return "dark";
  });

  // Initial load side effects (cleanup only)
  useEffect(() => {
    // Clean up legacy keys
    if (typeof window !== "undefined") {
      LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
    }
  }, []);

  // Apply theme class to document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
      // For backward compatibility with some styles using .light-mode on body
      document.body.classList.add("light-mode");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
      document.body.classList.remove("light-mode");
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const value = {
    isLightMode: theme === "light",
    theme,
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
