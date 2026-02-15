import { useState } from "react";

import { ChevronUp } from "lucide-react";

import styles from "./pill.module.css";

interface PillProps {
  colour?: string;
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
  <div className={`${styles.pillGroup} ${nowrap ? styles.pillGroupNowrap : ""}`}>
    {children}
  </div>
);

const Pill = ({
  colour,
  isDropdown,
  isActive,
  isDisabled,
  minWidth,
  onClick,
  children,
}: PillProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (colour && colour.startsWith("var(--color-")) {
    colour = getComputedStyle(document.documentElement)
      .getPropertyValue(colour.slice(4, -1))
      .trim();
  }

  return (
    <div
      className={`${styles.pill} ${styles.pillText} ${isActive ? styles.pillActive : ""} ${isDisabled ? styles.pillDisabled : ""}`}
      style={
        {
          "--pill-colour": colour ? colour : "var(--color-link)",
          "--pill-subtle-hover-color": `${colour}15`,
          minWidth: minWidth ? `${minWidth}px` : "fit-content",
        } as React.CSSProperties & { [key: string]: string | number | undefined }
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
