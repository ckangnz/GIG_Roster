import { Sun, Moon } from "lucide-react";

import { useTheme } from "../../hooks/useThemeHook";
import "./theme-toggle-button.css";

const ThemeToggleButton = ({ showText }: { showText?: boolean }) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      className="theme-toggle-button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      {showText && <span>Toggle theme</span>}
    </button>
  );
};
export default ThemeToggleButton;
