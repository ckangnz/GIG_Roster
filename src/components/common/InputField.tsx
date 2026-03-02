import React, { InputHTMLAttributes } from "react";

import styles from "./input-field.module.css";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: boolean;
  errorText?: string;
}

export const InputField = ({
  label,
  className,
  error,
  errorText,
  ...props
}: InputFieldProps) => {
  return (
    <div className={styles.inputWrapper}>
      {label && (
        <label
          className={styles.label}
          aria-required={props["aria-required"] ? "true" : "false"}
        >
          {label}
        </label>
      )}
      <input
        className={`${styles.input} ${error ? styles.inputError : ""} ${className || ""}`}
        {...props}
      />
      {error && errorText && <span className={styles.errorText}>{errorText}</span>}
    </div>
  );
};

interface SelectFieldProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}

export const SelectField = ({
  label,
  className,
  children,
  ...props
}: SelectFieldProps) => {
  return (
    <div className={styles.inputWrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <select className={`${styles.select} ${className || ""}`} {...props}>
        {children}
      </select>
    </div>
  );
};

interface TextAreaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const TextAreaField = ({
  label,
  className,
  ...props
}: TextAreaFieldProps) => {
  return (
    <div className={styles.inputWrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <textarea
        className={`${styles.textarea} ${className || ""}`}
        {...props}
      />
    </div>
  );
};
