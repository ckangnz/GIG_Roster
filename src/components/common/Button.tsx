import React from "react";

import Spinner from "./Spinner";

import styles from "./button.module.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "delete";
  size?: "medium" | "small";
  isIcon?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button = ({
  variant = "primary",
  size = "medium",
  isIcon = false,
  isLoading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    size === "small" ? styles.small : "",
    isIcon ? styles.icon : "",
    isLoading ? styles.loading : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button 
      className={buttonClasses} 
      disabled={disabled || isLoading} 
      {...props}
    >
      {isLoading ? (
        <div className={styles.spinnerContainer}>
          <Spinner />
        </div>
      ) : children}
    </button>
  );
};

export default Button;
