import { useState } from "react";

import { ChevronUp } from "lucide-react";

import "./pill.css";

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
  <div className={`pill-group ${nowrap ? "pill-group-nowrap" : ""}`}>
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
      className={`pill pill--text ${isActive ? "pill-active" : ""} ${isDisabled ? "pill-disabled" : ""}`}
      style={
        {
          "--pill-colour": colour ? colour : "var(--color-link)",
          "--pill-subtle-hover-color": `${colour}15`,
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
