import { useState } from "react";

import { ChevronUp } from "lucide-react";

import styles from "./pill.module.css";

interface PillProps {
  colour?: string;
  bgColour?: string;
  textColour?: string;
  isDropdown?: boolean;
  isActive?: boolean;
  isDisabled?: boolean;
  minWidth?: number;
  onClick?: (evt: React.MouseEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}

export const PillGroup = ({
  children,
  nowrap,
}: {
  children: React.ReactNode;
  nowrap?: boolean;
}) => (
  <div
    className={`${styles.pillGroup} ${nowrap ? styles.pillGroupNowrap : ""}`}
  >
    {children}
  </div>
);

const Pill = ({
  colour,
  bgColour,
  textColour,
  isDropdown,
  isActive,
  isDisabled,
  minWidth,
  onClick,
  children,
}: PillProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Directly use the variable or fallback
  const pillColour = colour || "var(--color-primary)";

  return (
    <div
      className={`${styles.pill} ${styles.pillText} ${isActive ? styles.pillActive : ""} ${isDisabled ? styles.pillDisabled : ""}`}
      style={
        {
          "--pill-colour": pillColour,
          "--pill-bg": bgColour,
          "--pill-color": textColour,
          minWidth: minWidth ? `${minWidth}px` : "fit-content",
        } as React.CSSProperties
      }
      onClick={(evt) => {
        if (isDisabled) return;

        setIsOpen((prev) => !prev);
        if (onClick) onClick(evt);
      }}
    >
      {children}
      {isDropdown && <ChevronUp style={{ rotate: isOpen ? "90deg" : "0" }} />}
    </div>
  );
};

export default Pill;
