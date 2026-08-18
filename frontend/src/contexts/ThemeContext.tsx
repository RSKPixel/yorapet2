import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { ThemeContext } from "@/contexts/themeContextInstance";
import type { ThemeMode } from "@/contexts/themeTypes";

const THEME_STORAGE_KEY = "yorapet.theme";
const ROOT_FONT_SIZE_STORAGE_KEY = "yorapet.root-font-size-increment";
const ROOT_FONT_SIZE_BASE_PX = 16;
const ROOT_FONT_SIZE_MIN_INCREMENT = 0;
const ROOT_FONT_SIZE_MAX_INCREMENT = 4;

type ThemeProviderProps = {
  children: ReactNode;
};

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

function clampRootFontSizeIncrement(value: number): number {
  return Math.max(
    ROOT_FONT_SIZE_MIN_INCREMENT,
    Math.min(ROOT_FONT_SIZE_MAX_INCREMENT, value),
  );
}

function readStoredTheme(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeMode(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage access errors (private mode, etc.).
  }
  return "dark";
}

function readStoredRootFontSizeIncrement(): number {
  try {
    const stored = window.localStorage.getItem(ROOT_FONT_SIZE_STORAGE_KEY);
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if (Number.isFinite(parsed)) {
        return clampRootFontSizeIncrement(parsed);
      }
    }
  } catch {
    // Ignore storage access errors (private mode, etc.).
  }
  return 0;
}

function applyTheme(theme: ThemeMode, rootFontSizeIncrement: number) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
  document.documentElement.style.fontSize = `${ROOT_FONT_SIZE_BASE_PX + rootFontSizeIncrement}px`;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() => readStoredTheme());
  const [rootFontSizeIncrement, setRootFontSizeIncrementState] = useState<number>(() =>
    readStoredRootFontSizeIncrement(),
  );

  useEffect(() => {
    applyTheme(theme, rootFontSizeIncrement);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      window.localStorage.setItem(
        ROOT_FONT_SIZE_STORAGE_KEY,
        String(rootFontSizeIncrement),
      );
    } catch {
      // Ignore storage write errors.
    }
  }, [rootFontSizeIncrement, theme]);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
  }, []);

  const setRootFontSizeIncrement = useCallback((next: number) => {
    setRootFontSizeIncrementState(clampRootFontSizeIncrement(next));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      rootFontSizeIncrement,
      setRootFontSizeIncrement,
    }),
    [rootFontSizeIncrement, setRootFontSizeIncrement, setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
