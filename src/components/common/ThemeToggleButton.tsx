import { Sun, Moon } from "lucide-react";

import { useTheme } from "../../hooks/useThemeHook";

import styles from "./theme-toggle-button.module.css";

const ThemeToggleButton = ({
  showText,
  className,
}: {
  showText?: boolean;
  className?: string;
}) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      className={`${styles.themeToggleButton} ${className || ""}`}
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      {showText && <span>Toggle theme</span>}
    </button>
  );
};
export default ThemeToggleButton;
