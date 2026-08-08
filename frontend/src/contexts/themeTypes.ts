export type ThemeMode = "light" | "dark";

export type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  rootFontSizeIncrement: number;
  setRootFontSizeIncrement: (increment: number) => void;
};
