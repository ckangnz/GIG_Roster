import React, { InputHTMLAttributes } from "react";

import styles from "./input-field.module.css";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const InputField = ({ label, className, ...props }: InputFieldProps) => {
  return (
    <div className={styles.inputWrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <input className={`${styles.input} ${className || ""}`} {...props} />
    </div>
  );
};

interface SelectFieldProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}

export const SelectField = ({ label, className, children, ...props }: SelectFieldProps) => {
  return (
    <div className={styles.inputWrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <select className={`${styles.select} ${className || ""}`} {...props}>
        {children}
      </select>
    </div>
  );
};
