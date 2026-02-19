import { memo } from "react";

import { Position, RosterEntry } from "../../../model/model";
import RosterCell from "../RosterCell";
import RosterRow from "../RosterRow";

interface CustomRosterRowProps {
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
  currentPosition?: Position;
  handleCellClick: (
    dateString: string,
    userEmail: string,
    row: number,
    col: number,
  ) => void;
  getCellContent: (dateString: string, userEmail: string) => React.ReactNode;
  showPeek?: boolean;
}

export const CustomRosterRow = memo(
  ({
    dateString,
    rowIndex,
    focusedCell,
    setFocusedCell,
    entries,
    dirtyEntries,
    onDateClick,
    closestNextDate,
    currentPosition,
    handleCellClick,
    getCellContent,
    showPeek,
  }: CustomRosterRowProps) => {
    return (
      <RosterRow
        dateString={dateString}
        entries={entries}
        dirtyEntries={dirtyEntries}
        onDateClick={onDateClick}
        closestNextDate={closestNextDate}
        showPeek={showPeek}
      >
        {(currentPosition?.customLabels || []).map((label, colIndex) => (
          <RosterCell
            key={`custom-cell-${colIndex}`}
            type="roster-custom"
            dateString={dateString}
            rowIndex={rowIndex}
            colIndex={colIndex}
            isFocused={
              focusedCell?.row === rowIndex &&
              focusedCell?.col === colIndex &&
              focusedCell?.table === "roster"
            }
            onFocus={() =>
              setFocusedCell({ row: rowIndex, col: colIndex, table: "roster" })
            }
            content={label && getCellContent(dateString, label)}
            onClick={() => {
              if (label) {
                handleCellClick(dateString, label, rowIndex, colIndex);
              }
            }}
          />
        ))}
      </RosterRow>
    );
  },
);
