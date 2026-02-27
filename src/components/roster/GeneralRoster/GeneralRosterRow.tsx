import { Fragment, memo } from "react";

import { useAppSelector } from "../../../hooks/redux";
import { AppUser, RosterEntry } from "../../../model/model";
import cellStyles from "../roster-cell.module.css";
import RosterCell from "../RosterCell";
import RosterRow from "../RosterRow";

interface GeneralRosterRowProps {
  dateString: string;
  rowIndex: number;
  focusedCell: { row: number; col: number; table: string } | null;
  setFocusedCell: (
    cell: { row: number; col: number; table: "roster" | "absence" | "all" } | null,
  ) => void;
  entries: Record<string, RosterEntry>;
  onDateClick: (date: string) => void;
  closestNextDate?: string | null;
  handleCellClick: (
    dateString: string,
    userEmail: string,
    row: number,
    col: number,
  ) => void;
  getCellContent: (dateString: string, userEmail: string) => React.ReactNode;
  sortedUsers: AppUser[];
  genderDividerIndex: number;
  isCellDisabled: (dateString: string, userEmail: string) => boolean;
  isUserAbsent: (dateString: string, userEmail: string) => boolean;
  getAbsenceReason: (dateString: string, userEmail: string) => string;
  assignedOnClosestDate: string[];
  showPeek?: boolean;
  getConflictStatus: (dateString: string, userEmail: string) => { hasConflict: boolean };
}

export const GeneralRosterRow = memo(
  ({
    dateString,
    rowIndex,
    focusedCell,
    setFocusedCell,
    entries,
    onDateClick,
    closestNextDate,
    handleCellClick,
    getCellContent,
    sortedUsers,
    genderDividerIndex,
    isCellDisabled,
    isUserAbsent,
    getAbsenceReason,
      assignedOnClosestDate,
      showPeek,
      getConflictStatus,
    }: GeneralRosterRowProps) => {
      const { highlightedUserId } = useAppSelector((state) => state.rosterView);
    
      return (
        <RosterRow
          dateString={dateString}
          entries={entries}
          onDateClick={onDateClick}
          closestNextDate={closestNextDate}
          showPeek={showPeek}
        >
          {sortedUsers.map((user, colIndex) => (
            <Fragment key={user.email}>
              {genderDividerIndex === colIndex && (
                <td style={{ width: "8px", background: "var(--border-color-secondary)" }} />
              )}
              <RosterCell
                type="roster-user"
                dateString={dateString}
                rowIndex={rowIndex}
                isFocused={
                  focusedCell?.row === rowIndex &&
                  focusedCell?.col === colIndex &&
                  focusedCell?.table === "roster"
                }
                onFocus={() =>
                  setFocusedCell({ row: rowIndex, col: colIndex, table: "roster" })
                }
                identifier={user.email || ""}
                disabled={
                  user.email ? isCellDisabled(dateString, user.email) : false
                }
                absent={user.email ? isUserAbsent(dateString, user.email) : false}
                absenceReason={
                  user.email ? getAbsenceReason(dateString, user.email) : ""
                }
                isAssignedOnClosestDate={!!(
                  dateString === closestNextDate &&
                  user.email &&
                  assignedOnClosestDate.includes(user.email)
                )}
                                                hasConflict={user.email ? getConflictStatus(dateString, user.email).hasConflict : false}
                                                isHighlighted={user.email === highlightedUserId}
                                                content={
                                                                            user.email ? (
                                              <div
                                                className={
                                                  user.email === highlightedUserId
                                                    ? cellStyles.highlightedUserName
                                                    : ""
                                                }
                                              >
                                                {getCellContent(dateString, user.email)}
                                              </div>
                                            ) : null
                                          }
                            
                            onClick={() => {
                
                  if (user.email && !isCellDisabled(dateString, user.email)) {
                    handleCellClick(dateString, user.email, rowIndex, colIndex);
                  }
                }}
              />
            </Fragment>
          ))}
          <td style={{ width: "8px", background: "var(--border-color-secondary)" }} />
        </RosterRow>
      );
    },
);
