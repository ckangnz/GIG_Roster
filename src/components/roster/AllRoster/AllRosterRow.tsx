import { ReactNode, memo } from "react";

import { Position, RosterEntry } from "../../../model/model";
import RosterCell from "../RosterCell";
import RosterRow from "../RosterRow";

interface AllRosterRowProps {
  dateString: string;
  rowIndex: number;
  focusedCell: { row: number; col: number; table: string } | null;
  setFocusedCell: (
    cell: { row: number; col: number; table: "roster" | "absence" | "all" } | null,
  ) => void;
  entries: Record<string, RosterEntry>;
  onDateClick: (date: string) => void;
  closestNextDate?: string | null;
  rosterAllViewMode?: "user" | "position";
  allViewColumns: { id: string; name: string; isUser: boolean }[];
  currentTeamData: { positions: Position[] } | null;
  getAllViewUserCellContent: (
    dateString: string,
    userIdentifier: string,
  ) => ReactNode;
  getAllViewPositionCellContent: (
    dateString: string,
    positionName: string,
  ) => ReactNode;
  getAssignmentsForIdentifier: (
    dateString: string,
    identifier: string,
  ) => string[];
  navigate: (path: string) => void;
  teamName?: string;
  isUserAbsent: (dateString: string, userEmail: string) => boolean;
  getAbsenceReason: (dateString: string, userEmail: string) => string;
}

export const AllRosterRow = memo(
  ({
    dateString,
    rowIndex,
    focusedCell,
    setFocusedCell,
    entries,
    onDateClick,
    closestNextDate,
    rosterAllViewMode,
    allViewColumns,
    currentTeamData,
    getAllViewUserCellContent,
    getAllViewPositionCellContent,
    getAssignmentsForIdentifier,
    navigate,
    teamName,
    isUserAbsent,
    getAbsenceReason,
  }: AllRosterRowProps) => {
    return (
      <RosterRow
        dateString={dateString}
        entries={entries}
        onDateClick={onDateClick}
        closestNextDate={closestNextDate}
      >
        {rosterAllViewMode === "user"
          ? allViewColumns.map((col, colIndex) => (
              <RosterCell
                key={col.id}
                type="all-user"
                dateString={dateString}
                rowIndex={rowIndex}
                colIndex={colIndex}
                isFocused={
                  focusedCell?.row === rowIndex &&
                  focusedCell?.col === colIndex &&
                  focusedCell?.table === "all"
                }
                onFocus={() =>
                  setFocusedCell({ row: rowIndex, col: colIndex, table: "all" })
                }
                absent={col.id ? isUserAbsent(dateString, col.id) : false}
                absenceReason={
                  col.id ? getAbsenceReason(dateString, col.id) : ""
                }
                content={
                  col.id ? getAllViewUserCellContent(dateString, col.id) : null
                }
                onClick={() => {
                  const assignments = getAssignmentsForIdentifier(
                    dateString,
                    col.id,
                  );
                  if (assignments.length > 0) {
                    navigate(`/app/roster/${teamName}/${assignments[0]}`);
                  }
                }}
              />
            ))
          : (currentTeamData?.positions || []).map((pos, colIndex) => (
              <RosterCell
                key={pos.name}
                type="all-position"
                dateString={dateString}
                rowIndex={rowIndex}
                colIndex={colIndex}
                isFocused={
                  focusedCell?.row === rowIndex &&
                  focusedCell?.col === colIndex &&
                  focusedCell?.table === "all"
                }
                onFocus={() =>
                  setFocusedCell({ row: rowIndex, col: colIndex, table: "all" })
                }
                content={getAllViewPositionCellContent(dateString, pos.name)}
              />
            ))}
      </RosterRow>
    );
  },
);
