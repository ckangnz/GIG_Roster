import { memo } from "react";

import { AppUser, RosterEntry } from "../../../model/model";
import RosterCell from "../RosterCell";
import RosterRow from "../RosterRow";

interface AbsenceRosterRowProps {
  dateString: string;
  rowIndex: number;
  focusedCell: { row: number; col: number; table: string } | null;
  setFocusedCell: (
    cell: { row: number; col: number; table: "roster" | "absence" | "all" } | null,
  ) => void;
  entries: Record<string, RosterEntry>;
  dirtyEntries: Record<string, RosterEntry>;
  onDateClick: (date: string) => void;
  closestNextDate?: string | null;
  allTeamUsers: AppUser[];
  handleAbsenceClick: (
    dateString: string,
    userEmail: string,
    row: number,
    col: number,
  ) => void;
  handleAbsenceReasonChange: (
    dateString: string,
    userEmail: string,
    reason: string,
  ) => void;
  isUserAbsent: (dateString: string, userEmail: string) => boolean;
  getAbsenceReason: (dateString: string, userEmail: string) => string;
  showPeek?: boolean;
}

export const AbsenceRosterRow = memo(
  ({
    dateString,
    rowIndex,
    focusedCell,
    setFocusedCell,
    entries,
    dirtyEntries,
    onDateClick,
    closestNextDate,
    allTeamUsers,
    handleAbsenceClick,
    handleAbsenceReasonChange,
    isUserAbsent,
    getAbsenceReason,
    showPeek,
  }: AbsenceRosterRowProps) => {
    return (
      <RosterRow
        dateString={dateString}
        entries={entries}
        dirtyEntries={dirtyEntries}
        onDateClick={onDateClick}
        closestNextDate={closestNextDate}
        showPeek={showPeek}
      >
        {allTeamUsers.map((user, colIndex) => (
          <RosterCell
            key={user.email}
            type="absence"
            dateString={dateString}
            rowIndex={rowIndex}
            colIndex={colIndex}
            isFocused={
              focusedCell?.row === rowIndex &&
              focusedCell?.col === colIndex &&
              focusedCell?.table === "absence"
            }
            onFocus={() =>
              setFocusedCell({ row: rowIndex, col: colIndex, table: "absence" })
            }
            absent={user.email ? isUserAbsent(dateString, user.email) : false}
            absenceReason={
              user.email ? getAbsenceReason(dateString, user.email) : ""
            }
            onClick={() => {
              if (user.email) {
                handleAbsenceClick(dateString, user.email, rowIndex, colIndex);
              }
            }}
            handleAbsenceReasonChange={(reason) => {
              if (user.email) {
                handleAbsenceReasonChange(dateString, user.email, reason);
              }
            }}
          />
        ))}
      </RosterRow>
    );
  },
);
