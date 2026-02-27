import { ReactNode, memo } from "react";

import AbsenceCell from "./cells/AbsenceCell";
import CustomLabelCell from "./cells/CustomLabelCell";
import GlobalSummaryCell from "./cells/GlobalSummaryCell";
import UserAssignmentCell from "./cells/UserAssignmentCell";
import { AppUser, Team } from "../../model/model";

interface RosterCellProps {
  type: "all-user" | "all-position" | "roster-custom" | "roster-user" | "absence";
  rowIndex: number;
  isFocused: boolean;
  onFocus?: () => void;
  identifier: string; // email or custom label
  dateString: string;
  // Optional shared props
  absent?: boolean;
  absenceReason?: string;
  isAssignedOnClosestDate?: boolean;
  isHighlighted?: boolean;
  hasConflict?: boolean;
  content?: ReactNode;
  onClick?: () => void;
  // Absence View
  handleAbsenceReasonChange?: (reason: string) => void;
  // Roster View
  disabled?: boolean;
  userData?: AppUser | null;
  allTeams?: Team[];
  teamName?: string;
  activePosition?: string;
  hasOpenPositionRequest?: boolean;
}

/**
 * RosterCell acts as a coordinator that delegates rendering to specialized cell components.
 * This refactor (Phase 1) improves maintainability by decoupling different roster behaviors.
 */
const RosterCell = memo(({
  type,
  rowIndex,
  isFocused,
  onFocus,
  identifier,
  dateString,
  absent = false,
  absenceReason = "",
  isAssignedOnClosestDate = false,
  isHighlighted = false,
  hasConflict = false,
  content = null,
  onClick,
  handleAbsenceReasonChange,
  disabled = false,
  userData,
  allTeams,
  teamName,
  activePosition,
  hasOpenPositionRequest = false,
}: RosterCellProps) => {
  
  switch (type) {
    case "roster-user":
      return (
        <UserAssignmentCell
          rowIndex={rowIndex}
          isFocused={isFocused}
          onFocus={onFocus}
          identifier={identifier}
          dateString={dateString}
          content={content}
          onClick={onClick}
          disabled={disabled}
          absent={absent}
          absenceReason={absenceReason}
          isAssignedOnClosestDate={isAssignedOnClosestDate}
          isHighlighted={isHighlighted}
          hasConflict={hasConflict}
          userData={userData}
          allTeams={allTeams}
          teamName={teamName}
          activePosition={activePosition}
          hasOpenPositionRequest={hasOpenPositionRequest}
        />
      );

    case "absence":
      return (
        <AbsenceCell
          rowIndex={rowIndex}
          isFocused={isFocused}
          onFocus={onFocus}
          identifier={identifier}
          dateString={dateString}
          absent={absent}
          absenceReason={absenceReason}
          onClick={onClick}
          handleAbsenceReasonChange={handleAbsenceReasonChange}
          disabled={disabled}
        />
      );

    case "all-user":
      return (
        <GlobalSummaryCell
          rowIndex={rowIndex}
          isFocused={isFocused}
          onFocus={onFocus}
          identifier={identifier}
          dateString={dateString}
          content={content}
          onClick={onClick}
          absent={absent}
          absenceReason={absenceReason}
          isHighlighted={isHighlighted}
        />
      );

    case "all-position":
      return (
        <GlobalSummaryCell
          rowIndex={rowIndex}
          isFocused={isFocused}
          onFocus={onFocus}
          identifier={identifier}
          dateString={dateString}
          content={content}
          showFocus={false}
          isHighlighted={isHighlighted}
        />
      );

    case "roster-custom":
      return (
        <CustomLabelCell
          rowIndex={rowIndex}
          isFocused={isFocused}
          onFocus={onFocus}
          identifier={identifier}
          dateString={dateString}
          content={content}
          onClick={onClick}
        />
      );

    default:
      return null;
  }
});

export default RosterCell;
