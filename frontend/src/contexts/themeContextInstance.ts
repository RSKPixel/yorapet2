import { createContext } from "react";

import type { ThemeContextValue } from "@/contexts/themeTypes";

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
