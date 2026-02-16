import React from "react";

import styles from "./button.module.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "delete";
  size?: "medium" | "small";
  isIcon?: boolean;
  children: React.ReactNode;
}

const Button = ({
  variant = "primary",
  size = "medium",
  isIcon = false,
  className = "",
  children,
  ...props
}: ButtonProps) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    size === "small" ? styles.small : "",
    isIcon ? styles.icon : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={buttonClasses} {...props}>
      {children}
    </button>
  );
};

export default Button;
