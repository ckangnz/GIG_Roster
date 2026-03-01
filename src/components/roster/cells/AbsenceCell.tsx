import { memo } from "react";

import { X } from "lucide-react";
import { useTranslation } from "react-i18next";


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
  disabled?: boolean;
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
  disabled = false,
}: AbsenceCellProps) => {
  const { t } = useTranslation();
  const className = [
    !disabled ? styles.clickable : styles.disabled, 
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
      tabIndex={disabled ? -1 : 0}
      onClick={!disabled ? onClick : undefined}
      title={absenceReason}
    >
      {absent ? (
        <div className={absenceStyles.absenceInputContainer}>
          <input
            type="text"
            className={absenceStyles.absenceReasonInput}
            value={absenceReason}
            placeholder={`${t('roster.reason')}...`}
            maxLength={20}
            autoFocus={isFocused && !disabled}
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => handleAbsenceReasonChange?.(e.target.value)}
          />
          {!disabled && (
            <button
              className={absenceStyles.removeAbsenceBtn}
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              title={t('common.confirm', { defaultValue: 'Mark as present' })}
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        ""
      )}
    </BaseRosterCell>
  );
});

export default AbsenceCell;
