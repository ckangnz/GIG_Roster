import { ReactNode, memo, useEffect, useRef } from "react";

import { X } from "lucide-react";

import absenceStyles from "./AbsenceRoster/absence-roster.module.css";
import styles from "./roster-cell.module.css";

interface RosterCellProps {
  type: "all-user" | "all-position" | "roster-custom" | "roster-user" | "absence";
  dateString: string;
  rowIndex: number;
  colIndex: number;
  isFocused: boolean;
  onFocus: () => void;
  // All View
  id?: string;
  absent?: boolean;
  absenceReason?: string;
  isAssignedOnClosestDate?: boolean;
  content?: ReactNode;
  onClick?: () => void;
  // Absence View
  handleAbsenceReasonChange?: (reason: string) => void;
  // Roster View
  disabled?: boolean;
}

const RosterCell = memo(({
  type,
  rowIndex,
  isFocused,
  onFocus,
  absent,
  absenceReason,
  isAssignedOnClosestDate,
  content,
  onClick,
  handleAbsenceReasonChange,
  disabled,
}: RosterCellProps) => {
  const cellRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (isFocused && cellRef.current) {
      cellRef.current.focus();
      // Ensure the cell is visible during keyboard navigation
      cellRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [isFocused]);

  const commonClasses = [
    styles.rosterCell,
    isFocused ? styles.focused : "",
    isAssignedOnClosestDate ? styles.highlightedCell : "",
  ];

  if (type === "all-user") {
    return (
      <td
        ref={cellRef}
        className={[...commonClasses, styles.clickable, absent ? styles.absentStrike : ""].filter(Boolean).join(" ")}
        tabIndex={0}
        onClick={onClick}
        onFocus={onFocus}
      >
        {absent && isFocused && (
          <div className={`${styles.reasonPopover} ${rowIndex === 0 ? styles.popoverBottom : ""}`}>
            {absenceReason || <span className={styles.noReason}>No reason provided</span>}
          </div>
        )}
        {absent ? <span title={absenceReason}>❌</span> : content}
      </td>
    );
  }

  if (type === "all-position") {
    return (
      <td ref={cellRef} className={commonClasses.filter(Boolean).join(" ")} tabIndex={0} onFocus={onFocus}>
        {content}
      </td>
    );
  }

  if (type === "roster-custom") {
    return (
      <td
        ref={cellRef}
        className={[...commonClasses, styles.clickable].filter(Boolean).join(" ")}
        onClick={onClick}
        tabIndex={0}
        onFocus={onFocus}
      >
        {content}
      </td>
    );
  }

  if (type === "roster-user") {
    return (
      <td
        ref={cellRef}
        className={[
          ...commonClasses,
          !disabled ? styles.clickable : styles.disabled,
          absent ? styles.absentStrike : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onClick}
        tabIndex={0}
        onFocus={onFocus}
      >
        {absent && isFocused && (
          <div className={`${styles.reasonPopover} ${rowIndex === 0 ? styles.popoverBottom : ""}`}>
            {absenceReason || <span className={styles.noReason}>No reason provided</span>}
          </div>
        )}
        {absent ? <span title={absenceReason}>❌</span> : content}
      </td>
    );
  }

  if (type === "absence") {
    return (
      <td
        ref={cellRef}
        className={[
          ...commonClasses, 
          styles.clickable, 
          absenceStyles.absenceRosterCell, 
          absent ? absenceStyles.absentCell : ""
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onClick}
        tabIndex={0}
        onFocus={onFocus}
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
      </td>
    );
  }

  return null;
});

export default RosterCell;
