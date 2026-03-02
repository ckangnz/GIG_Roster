import { useState } from "react";

import { Sun, Moon, Laptop, SunMoon } from "lucide-react";
import { useTranslation } from "react-i18next";

import ActionSheet from "./ActionSheet";
import { useTheme } from "../../hooks/useThemeHook";

import styles from "./theme-toggle-button.module.css";

const ThemeToggleButton = ({
  showText,
  className,
  iconClassName,
}: {
  showText?: boolean;
  className?: string;
  iconClassName?: string;
}) => {
  const { t } = useTranslation();
  const { setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    {
      id: "light",
      label: t("settings.light", { defaultValue: "Light" }),
      icon: Sun,
    },
    {
      id: "dark",
      label: t("settings.dark", { defaultValue: "Dark" }),
      icon: Moon,
    },
    {
      id: "system",
      label: t("settings.system", { defaultValue: "System" }),
      icon: Laptop,
    },
  ] as const;

  const handleSelect = (id: "light" | "dark" | "system") => {
    setTheme(id);
    setIsOpen(false);
  };

  return (
    <>
      <button
        className={`${styles.themeToggleButton} ${className || ""}`}
        onClick={() => setIsOpen(true)}
        aria-label="Change theme"
      >
        <span className={iconClassName || ""}>
          <SunMoon size={20} />
        </span>
        {showText && <span>Theme</span>}
      </button>

      <ActionSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t("settings.chooseTheme", { defaultValue: "Choose Theme" })}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "1.25rem",
                  background: "var(--background-button-secondary)",
                  border: "1px solid var(--border-color-secondary)",
                  borderRadius: "12px",
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: 600,
                }}
              >
                <span>{opt.label}</span>
                <Icon size={20} color="var(--color-link)" />
              </button>
            );
          })}
        </div>
      </ActionSheet>
    </>
  );
};

export default ThemeToggleButton;
