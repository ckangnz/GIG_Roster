import { useState, useEffect, ReactNode, useCallback, useMemo } from "react";

import { doc, getDoc, updateDoc } from "firebase/firestore";

import { auth, db } from "../firebase";
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

  const updatePreference = useCallback((newMode: Theme) => {
    setThemeMode(newMode);
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      updateDoc(userRef, {
        preferredTheme: newMode,
      }).catch((error) =>
        console.error("Error updating preferred theme in Firebase:", error),
      );
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    updatePreference(newTheme);
  }, [updatePreference]);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      // If currently system, we toggle to the opposite of what system currently is
      if (prev === "system") {
        const next = systemTheme === "light" ? "dark" : "light";
        updatePreference(next);
        return next;
      }
      // If manual, we just flip
      const next = prev === "light" ? "dark" : "light";
      updatePreference(next);
      return next;
    });
  }, [systemTheme, updatePreference]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && docSnap.data().preferredTheme) {
          const firebaseTheme = docSnap.data().preferredTheme as Theme;
          setThemeMode(firebaseTheme);
        }
      }
    });
    return unsubscribe;
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: appliedTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
