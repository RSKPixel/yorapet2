import { useContext } from "react";

import { ThemeContext } from "@/contexts/themeContextInstance";
import type { ThemeContextValue } from "@/contexts/themeTypes";

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
