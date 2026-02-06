import { Sun, Moon } from "lucide-react";

import { useTheme } from "../../hooks/useThemeHook";
const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      className="theme-toggle-button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};
export default ThemeToggleButton;
