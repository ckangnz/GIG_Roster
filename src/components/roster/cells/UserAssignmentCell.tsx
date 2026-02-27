import { memo, ReactNode } from "react";

import BaseRosterCell from "./BaseRosterCell";
import styles from "../roster-cell.module.css";

interface UserAssignmentCellProps {
  rowIndex: number;
  isFocused: boolean;
  onFocus?: () => void;
  identifier: string;
  dateString: string;
  content: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  absent?: boolean;
  absenceReason?: string;
  isAssignedOnClosestDate?: boolean;
  isHighlighted?: boolean;
}

const UserAssignmentCell = memo(({
  rowIndex,
  isFocused,
  onFocus,
  identifier,
  dateString,
  content,
  onClick,
  disabled,
  absent,
  absenceReason,
  isAssignedOnClosestDate,
  isHighlighted,
}: UserAssignmentCellProps) => {
  const hasContent = !!content || absent;

  const className = [
    !disabled ? styles.clickable : styles.disabled,
    absent ? styles.absentStrike : "",
  ].filter(Boolean).join(" ");

  return (
    <BaseRosterCell
      rowIndex={rowIndex}
      isFocused={isFocused}
      onFocus={onFocus}
      identifier={identifier}
      dateString={dateString}
      className={className}
      tabIndex={hasContent ? 0 : -1}
      onClick={onClick}
      isAssignedOnClosestDate={isAssignedOnClosestDate}
      isHighlighted={isHighlighted}
    >
      <div className={styles.cellContent}>
        {absent && isFocused && (
          <div className={`${styles.reasonPopover} ${rowIndex === 0 ? styles.popoverBottom : ""}`}>
            {absenceReason || <span className={styles.noReason}>No reason provided</span>}
          </div>
        )}
        {absent ? <span title={absenceReason}>❌</span> : content}
      </div>
    </BaseRosterCell>
  );
});

export default UserAssignmentCell;
