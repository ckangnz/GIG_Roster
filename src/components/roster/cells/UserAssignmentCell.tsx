import { memo, ReactNode } from "react";

import BaseRosterCell from "./BaseRosterCell";
import { AppUser, Team } from "../../../model/model";
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
  hasConflict?: boolean;
  userData?: AppUser | null;
  allTeams?: Team[];
  teamName?: string;
  activePosition?: string;
  hasOpenPositionRequest?: boolean;
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
  hasConflict,
  userData,
  hasOpenPositionRequest = false,
}: UserAssignmentCellProps) => {
  const hasContent = !!content || absent;
  const isMe = identifier === userData?.email;
  const isAdmin = !!userData?.isAdmin;

  // Logic to determine if "Claim Shift" should show
  // 1. Cell must be empty (no content and not absent)
  // 2. The row MUST have an open coverage request for this specific position
  // 3. Admin sees it for everyone, non-admin only for themselves
  const canClaim = !hasContent && hasOpenPositionRequest && (isAdmin || isMe);

  const className = [
    (!disabled || canClaim) ? styles.clickable : styles.disabled,
    absent ? styles.absentStrike : "",
    canClaim ? styles.canClaimRow : "",
  ].filter(Boolean).join(" ");

  return (
    <BaseRosterCell
      rowIndex={rowIndex}
      isFocused={isFocused}
      onFocus={onFocus}
      identifier={identifier}
      dateString={dateString}
      className={className}
      tabIndex={hasContent || canClaim ? 0 : -1}
      onClick={(!disabled || canClaim) ? onClick : undefined}
      isAssignedOnClosestDate={isAssignedOnClosestDate}
      isHighlighted={isHighlighted}
    >
      <div className={styles.cellContent}>
        {hasConflict && !absent && (
          <div className={styles.conflictIndicator} title="User has multiple assignments on this day" />
        )}
        {absent && isFocused && (
          <div className={`${styles.reasonPopover} ${rowIndex === 0 ? styles.popoverBottom : ""}`}>
            {absenceReason || <span className={styles.noReason}>No reason provided</span>}
          </div>
        )}
        {absent ? (
          <span title={absenceReason}>❌</span>
        ) : content ? (
          content
        ) : canClaim ? (
          <div className={`${styles.claimButtonContainer} ${styles.permanentClaim}`}>
            <span className={styles.claimText}>Claim</span>
          </div>
        ) : null}
      </div>
    </BaseRosterCell>
  );
});

export default UserAssignmentCell;
