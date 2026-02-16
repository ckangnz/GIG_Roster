import styles from "../../styles/settings-common.module.css";

interface SummaryCellProps {
  primaryText: string;
  secondaryText?: string;
  onClick: () => void;
}

const SummaryCell = ({ primaryText, secondaryText, onClick }: SummaryCellProps) => {
  return (
    <button className={styles.summaryButton} onClick={onClick}>
      <span className={styles.summaryPrimary}>{primaryText}</span>
      {secondaryText && (
        <span className={styles.summarySecondary}>{secondaryText}</span>
      )}
    </button>
  );
};

export default SummaryCell;
