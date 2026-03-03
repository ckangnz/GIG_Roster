import { useState, useEffect, ReactNode, useCallback, useMemo } from "react";

import { Theme, ThemeContext } from "./ThemeContext";

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Theme can be "light", "dark", or "system"
  const [themeMode, setThemeMode] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("app-theme") as Theme;
    return savedTheme || "system";
  });

  // Calculate the actual applied theme (light or dark)
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // The final theme to apply to the DOM
  const appliedTheme = useMemo(() => {
    if (themeMode === "system") return systemTheme;
    return themeMode;
  }, [themeMode, systemTheme]);

  const applyToDOM = useCallback((theme: "light" | "dark") => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  useEffect(() => {
    applyToDOM(appliedTheme);
    localStorage.setItem("app-theme", themeMode);
  }, [appliedTheme, themeMode, applyToDOM]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeMode(newTheme);
    localStorage.setItem("app-theme", newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      // If currently system, we toggle to the opposite of what system currently is
      const currentApplied = prev === "system" ? systemTheme : prev;
      const next: Theme = currentApplied === "light" ? "dark" : "light";
      localStorage.setItem("app-theme", next);
      return next;
    });
  }, [systemTheme]);

  return (
    <ThemeContext.Provider value={{ theme: appliedTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
