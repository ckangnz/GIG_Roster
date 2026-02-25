import React from "react";

import styles from "./settings-group.module.css";

interface SettingsGroupProps {
  label?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const SettingsGroup = ({
  label,
  description,
  children,
  className = "",
}: SettingsGroupProps) => {
  return (
    <div className={`${styles.settingsGroup} ${className}`}>
      {label && <h4 className={styles.settingsGroupTitle}>{label}</h4>}
      {description && <p className={styles.settingsGroupDescription}>{description}</p>}
      {children}
    </div>
  );
};

interface SettingsRowProps {
  label: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export const SettingsRow = ({
  label,
  description,
  action,
  children,
}: SettingsRowProps) => {
  return (
    <div className={styles.settingsRow}>
      <div className={styles.settingsRowContent}>
        <span className={styles.settingsRowLabel}>{label}</span>
        {description && (
          <span className={styles.settingsRowDescription}>{description}</span>
        )}
        {children}
      </div>
      {action && <div className={styles.settingsRowAction}>{action}</div>}
    </div>
  );
};
