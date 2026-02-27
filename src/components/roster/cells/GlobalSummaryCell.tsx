import { memo, ReactNode } from "react";

import BaseRosterCell from "./BaseRosterCell";
import styles from "../roster-cell.module.css";

interface GlobalSummaryCellProps {
  rowIndex: number;
  isFocused: boolean;
  onFocus?: () => void;
  identifier: string;
  dateString: string;
  content: ReactNode;
  onClick?: () => void;
  absent?: boolean;
  absenceReason?: string;
  isHighlighted?: boolean;
  showFocus?: boolean;
}

const GlobalSummaryCell = memo(({
  rowIndex,
  isFocused,
  onFocus,
  identifier,
  dateString,
  content,
  onClick,
  absent,
  absenceReason,
  isHighlighted,
  showFocus = true,
}: GlobalSummaryCellProps) => {
  const hasContent = !!content || absent;

  const className = [
    hasContent ? styles.clickable : "",
    absent ? styles.absentStrike : "",
  ].filter(Boolean).join(" ");

  return (
    <BaseRosterCell
      rowIndex={rowIndex}
      isFocused={showFocus ? isFocused : false}
      onFocus={hasContent ? onFocus : undefined}
      identifier={identifier}
      dateString={dateString}
      className={className}
      tabIndex={hasContent ? 0 : -1}
      onClick={hasContent ? onClick : undefined}
      isHighlighted={isHighlighted}
      title={absent ? absenceReason : undefined}
    >
      {absent && isFocused && showFocus && (
        <div className={`${styles.reasonPopover} ${rowIndex === 0 ? styles.popoverBottom : ""}`}>
          {absenceReason || <span className={styles.noReason}>No reason provided</span>}
        </div>
      )}
      {absent ? <span>❌</span> : content}
    </BaseRosterCell>
  );
});

export default GlobalSummaryCell;
