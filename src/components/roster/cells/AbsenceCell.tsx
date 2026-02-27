import { memo } from "react";

import { X } from "lucide-react";

import BaseRosterCell from "./BaseRosterCell";
import absenceStyles from "../AbsenceRoster/absence-roster.module.css";
import styles from "../roster-cell.module.css";

interface AbsenceCellProps {
  rowIndex: number;
  isFocused: boolean;
  onFocus?: () => void;
  identifier: string;
  dateString: string;
  absent: boolean;
  absenceReason: string;
  onClick?: () => void;
  handleAbsenceReasonChange?: (reason: string) => void;
}

const AbsenceCell = memo(({
  rowIndex,
  isFocused,
  onFocus,
  identifier,
  dateString,
  absent,
  absenceReason,
  onClick,
  handleAbsenceReasonChange,
}: AbsenceCellProps) => {
  const className = [
    styles.clickable, 
    absenceStyles.absenceRosterCell, 
    absent ? absenceStyles.absentCell : ""
  ].filter(Boolean).join(" ");

  return (
    <BaseRosterCell
      rowIndex={rowIndex}
      isFocused={isFocused}
      onFocus={onFocus}
      identifier={identifier}
      dateString={dateString}
      className={className}
      tabIndex={0}
      onClick={onClick}
      title={absenceReason}
    >
      {absent ? (
        <div className={absenceStyles.absenceInputContainer}>
          <input
            type="text"
            className={absenceStyles.absenceReasonInput}
            value={absenceReason}
            placeholder="Reason..."
            maxLength={20}
            autoFocus={isFocused}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => handleAbsenceReasonChange?.(e.target.value)}
          />
          <button
            className={absenceStyles.removeAbsenceBtn}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            title="Mark as present"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        ""
      )}
    </BaseRosterCell>
  );
});

export default AbsenceCell;
