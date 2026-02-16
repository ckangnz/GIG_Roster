import React from "react";

import styles from "../../styles/settings-common.module.css";

interface SummaryCellProps {
  primaryText: React.ReactNode;
  secondaryText?: string;
  onClick: () => void;
}

const SummaryCell = ({
  primaryText,
  secondaryText,
  onClick,
}: SummaryCellProps) => {
  return (
    <button className={styles.summaryButton} onClick={onClick} type="button">
      <span className={styles.summaryPrimary}>{primaryText}</span>
      {secondaryText && (
        <>
          <span className={styles.summarySeparator}>•</span>
          <span className={styles.summarySecondary}>{secondaryText}</span>
        </>
      )}
    </button>
  );
};

export default SummaryCell;
