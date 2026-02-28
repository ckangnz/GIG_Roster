import { ReactNode, memo } from "react";

import { Position, RosterEntry, RosterSlot } from "../../../model/model";
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
  currentTeamData: { positions: string[] } | null;
  allPositions: Position[];
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
  isHighlightedCell: (dateString: string, identifier: string, type: 'user' | 'position') => boolean;
  getConflictStatus: (dateString: string, userEmail: string) => { hasConflict: boolean };
  // Slotted mode props
  slot?: RosterSlot;
  isFirstSlot?: boolean;
  isLastSlot?: boolean;
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
    allPositions,
    getAllViewUserCellContent,
    getAllViewPositionCellContent,
    getAssignmentsForIdentifier,
    navigate,
    teamName,
    isUserAbsent,
    getAbsenceReason,
    isHighlightedCell,
    getConflictStatus,
    slot,
    isFirstSlot = true,
    isLastSlot = true,
  }: AllRosterRowProps) => {
    return (
      <RosterRow
        dateString={dateString}
        entries={entries}
        onDateClick={onDateClick}
        closestNextDate={closestNextDate}
        slot={slot}
        isFirstSlot={isFirstSlot}
        isLastSlot={isLastSlot}
      >
        {rosterAllViewMode === "user"
          ? allViewColumns.map((col, colIndex) => (
              <RosterCell
                key={col.id}
                type="all-user"
                dateString={dateString}
                rowIndex={rowIndex}
                isFocused={
                  focusedCell?.row === rowIndex &&
                  focusedCell?.col === colIndex &&
                  focusedCell?.table === "all"
                }
                onFocus={() =>
                  setFocusedCell({ row: rowIndex, col: colIndex, table: "all" })
                }
                identifier={col.id || ""}
                absent={col.id ? isUserAbsent(dateString, col.id) : false}
                absenceReason={
                  col.id ? getAbsenceReason(dateString, col.id) : ""
                }
                isHighlighted={isHighlightedCell(dateString, col.id, 'user')}
                hasConflict={col.id ? getConflictStatus(dateString, col.id).hasConflict : false}
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
          : (currentTeamData?.positions || []).map((posId, colIndex) => {
              const pos = allPositions.find(p => p.id === posId || p.name === posId);
              return (
                <RosterCell
                  key={posId}
                  type="all-position"
                  dateString={dateString}
                  rowIndex={rowIndex}
                  isFocused={
                    focusedCell?.row === rowIndex &&
                    focusedCell?.col === colIndex &&
                    focusedCell?.table === "all"
                  }
                  onFocus={() =>
                    setFocusedCell({ row: rowIndex, col: colIndex, table: "all" })
                  }
                  identifier={pos?.id || posId}
                  isHighlighted={isHighlightedCell(dateString, pos?.id || posId, 'position')}
                  content={getAllViewPositionCellContent(dateString, pos?.id || posId)}
                />
              );
            })}
      </RosterRow>
    );
  },
);
