import { Fragment, ReactNode } from "react";

import RosterCell from "./RosterCell";
import { AppUser, Position } from "../../model/model";

import styles from "./roster-row.module.css";


interface RosterRowProps {
  viewType: "all" | "roster" | "absence";
  dateString: string;
  rowIndex: number;
  rowClass: string;
  isToday: boolean;
  hasData: boolean;
  eventName?: string;
  closestNextDate?: string;
  onDateClick: (dateString: string) => void;
  // Cell focus
  focusedCell: { row: number; col: number; table: string } | null;
  setFocusedCell: (cell: { row: number; col: number; table: "roster" | "absence" | "all" } | null) => void;
  // All View
  rosterAllViewMode?: "user" | "position";
  allViewColumns: { id: string; name: string; isUser: boolean }[];
  assignedOnClosestDate: string[];
  currentTeamData: { positions: Position[] } | null;
  getAllViewUserCellContent: (dateString: string, userIdentifier: string) => ReactNode;
  getAllViewPositionCellContent: (dateString: string, positionName: string) => ReactNode;
  getAssignmentsForIdentifier: (dateString: string, identifier: string) => string[];
  navigate: (path: string) => void;
  teamName?: string;
  // Roster View
  currentPosition?: Position;
  handleCellClick: (dateString: string, userEmail: string, row: number, col: number) => void;
  getCellContent: (dateString: string, userEmail: string) => ReactNode;
  sortedUsers: AppUser[];
  genderDividerIndex: number;
  isCellDisabled: (dateString: string, userEmail: string) => boolean;
  isUserAbsent: (dateString: string, userEmail: string) => boolean;
  getAbsenceReason: (dateString: string, userEmail: string) => string;
  getPeekAssignedUsers: (dateString: string) => string[];
  // Absence View
  allTeamUsers: AppUser[];
  handleAbsenceClick: (dateString: string, userEmail: string, row: number, col: number) => void;
  handleAbsenceReasonChange: (dateString: string, userEmail: string, reason: string) => void;
}

const RosterRow = ({
  viewType,
  dateString,
  rowIndex,
  rowClass,
  isToday,
  hasData,
  eventName,
  closestNextDate,
  onDateClick,
  focusedCell,
  setFocusedCell,
  rosterAllViewMode,
  allViewColumns,
  assignedOnClosestDate,
  currentTeamData,
  getAllViewUserCellContent,
  getAllViewPositionCellContent,
  getAssignmentsForIdentifier,
  navigate,
  teamName,
  currentPosition,
  handleCellClick,
  getCellContent,
  sortedUsers,
  genderDividerIndex,
  isCellDisabled,
  isUserAbsent,
  getAbsenceReason,
  getPeekAssignedUsers,
  allTeamUsers,
  handleAbsenceClick,
  handleAbsenceReasonChange,
}: RosterRowProps) => {
  const trClasses = [
    rowClass === "past-date" ? styles.pastDate : "",
    rowClass === "today-date" ? styles.todayDate : "",
    rowClass === "future-date" ? styles.futureDate : "",
    !hasData ? styles.noData : "",
    eventName ? styles.specialEventRow : "",
    dateString === closestNextDate ? styles.closestNextDateRow : "",
  ]
    .filter(Boolean)
    .join(" ");

  const renderDateCell = () => (
    <td
      className={`${styles.dateCell} ${styles.stickyCol} ${hasData ? styles.clickable : ""}`}
      onClick={() => onDateClick(dateString)}
      title={eventName}
    >
      <div className={styles.dateCellContent}>
        {eventName && <span className={styles.specialEventDot} />}
        {isToday && <span className={styles.rosterTodayDot} title="Today" />}
        {new Date(dateString.replace(/-/g, "/")).toLocaleDateString()}
      </div>
    </td>
  );

  const renderPeekCell = () => (
    <td className={`${styles.rosterCell} ${styles.peekCell} ${styles.stickyRight}`}>
      {getPeekAssignedUsers(dateString).join(", ") || ""}
    </td>
  );

  if (viewType === "all") {
    return (
      <tr className={trClasses}>
        {renderDateCell()}
        {rosterAllViewMode === "user"
          ? allViewColumns.map((col, colIndex) => (
              <RosterCell
                key={col.id}
                type="all-user"
                dateString={dateString}
                rowIndex={rowIndex}
                colIndex={colIndex}
                isFocused={focusedCell?.row === rowIndex && focusedCell?.col === colIndex && focusedCell?.table === "all"}
                onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex, table: "all" })}
                absent={col.id ? isUserAbsent(dateString, col.id) : false}
                absenceReason={col.id ? getAbsenceReason(dateString, col.id) : ""}
                isAssignedOnClosestDate={dateString === closestNextDate && col.id !== undefined && assignedOnClosestDate.includes(col.id)}
                content={col.id ? getAllViewUserCellContent(dateString, col.id) : null}
                onClick={() => {
                  const assignments = getAssignmentsForIdentifier(dateString, col.id);
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
                isFocused={focusedCell?.row === rowIndex && focusedCell?.col === colIndex && focusedCell?.table === "all"}
                onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex, table: "all" })}
                content={getAllViewPositionCellContent(dateString, pos.name)}
              />
            ))}
      </tr>
    );
  }

  if (viewType === "absence") {
    return (
      <tr className={trClasses}>
        {renderDateCell()}
        {allTeamUsers.map((user, colIndex) => (
          <RosterCell
            key={user.email}
            type="absence"
            dateString={dateString}
            rowIndex={rowIndex}
            colIndex={colIndex}
            isFocused={focusedCell?.row === rowIndex && focusedCell?.col === colIndex && focusedCell?.table === "absence"}
            onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex, table: "absence" })}
            absent={user.email ? isUserAbsent(dateString, user.email) : false}
            absenceReason={user.email ? getAbsenceReason(dateString, user.email) : ""}
            isAssignedOnClosestDate={!!(dateString === closestNextDate && user.email && assignedOnClosestDate.includes(user.email))}
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
        <td className={styles.genderDividerCell} />
        {renderPeekCell()}
      </tr>
    );
  }

  // Default "roster" view
  return (
    <tr className={trClasses}>
      {renderDateCell()}
      {currentPosition?.isCustom
        ? (currentPosition.customLabels || []).map((label, colIndex) => (
            <RosterCell
              key={`custom-cell-${colIndex}`}
              type="roster-custom"
              dateString={dateString}
              rowIndex={rowIndex}
              colIndex={colIndex}
              isFocused={focusedCell?.row === rowIndex && focusedCell?.col === colIndex && focusedCell?.table === "roster"}
              onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex, table: "roster" })}
              content={label && getCellContent(dateString, label)}
              onClick={() => {
                if (label) {
                  handleCellClick(dateString, label, rowIndex, colIndex);
                }
              }}
            />
          ))
        : sortedUsers.map((user, colIndex) => (
            <Fragment key={user.email}>
              {genderDividerIndex === colIndex && <td className={styles.genderDividerCell} />}
              <RosterCell
                type="roster-user"
                dateString={dateString}
                rowIndex={rowIndex}
                colIndex={colIndex}
                isFocused={
                  focusedCell?.row === rowIndex && focusedCell?.col === colIndex && focusedCell?.table === "roster"
                }
                onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex, table: "roster" })}
                disabled={user.email ? isCellDisabled(dateString, user.email) : false}
                absent={user.email ? isUserAbsent(dateString, user.email) : false}
                absenceReason={user.email ? getAbsenceReason(dateString, user.email) : ""}
                isAssignedOnClosestDate={
                  !!(dateString === closestNextDate && user.email && assignedOnClosestDate.includes(user.email))
                }
                content={user.email ? getCellContent(dateString, user.email) : null}
                onClick={() => {
                  if (user.email && !isCellDisabled(dateString, user.email)) {
                    handleCellClick(dateString, user.email, rowIndex, colIndex);
                  }
                }}
              />
            </Fragment>
          ))}
      {currentPosition?.isCustom && <td className={`${styles.rosterCell} ${styles.disabled}`} />}
      <td className={styles.genderDividerCell} />
      {renderPeekCell()}
    </tr>
  );
};

export default RosterRow;
