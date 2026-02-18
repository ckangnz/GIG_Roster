import { Fragment, ReactNode } from "react";

import { X } from "lucide-react";

import { AppUser, Position } from "../../model/model";

import styles from "./roster-table.module.css";

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
          ? allViewColumns.map((col, colIndex) => {
              const isFocused =
                focusedCell?.row === rowIndex && focusedCell?.col === colIndex && focusedCell?.table === "all";
              const absent = col.id ? isUserAbsent(dateString, col.id) : false;
              const isAssignedOnClosestDate =
                dateString === closestNextDate && col.id && assignedOnClosestDate.includes(col.id);

              return (
                <td
                  key={col.id}
                  className={`${styles.rosterCell} ${styles.clickable} ${isFocused ? styles.focused : ""} ${
                    absent ? styles.absentStrike : ""
                  } ${isAssignedOnClosestDate ? styles.highlightedCell : ""}`}
                  tabIndex={0}
                  onClick={() => {
                    const assignments = getAssignmentsForIdentifier(dateString, col.id);
                    if (assignments.length > 0) {
                      navigate(`/app/roster/${teamName}/${assignments[0]}`);
                    }
                  }}
                  onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex, table: "all" })}
                >
                  {col.id &&
                    (absent ? (
                      <span title={getAbsenceReason(dateString, col.id)}>❌</span>
                    ) : (
                      getAllViewUserCellContent(dateString, col.id)
                    ))}
                </td>
              );
            })
          : (currentTeamData?.positions || []).map((pos, colIndex) => {
              const isFocused =
                focusedCell?.row === rowIndex && focusedCell?.col === colIndex && focusedCell?.table === "all";

              return (
                <td
                  key={pos.name}
                  className={`${styles.rosterCell} ${isFocused ? styles.focused : ""}`}
                  tabIndex={0}
                  onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex, table: "all" })}
                >
                  {getAllViewPositionCellContent(dateString, pos.name)}
                </td>
              );
            })}
      </tr>
    );
  }

  if (viewType === "absence") {
    return (
      <tr className={trClasses}>
        {renderDateCell()}
        {allTeamUsers.map((user, colIndex) => {
          const isFocused =
            focusedCell?.row === rowIndex && focusedCell?.col === colIndex && focusedCell?.table === "absence";
          const absent = user.email ? isUserAbsent(dateString, user.email) : false;
          const reason = user.email ? getAbsenceReason(dateString, user.email) : "";
          const isAssignedOnClosestDate =
            dateString === closestNextDate && user.email && assignedOnClosestDate.includes(user.email);

          return (
            <td
              key={user.email}
              className={`${styles.rosterCell} ${styles.clickable} ${styles.absenceRosterCell} ${
                isFocused ? styles.focused : ""
              } ${absent ? styles.absentCell : ""} ${isAssignedOnClosestDate ? styles.highlightedCell : ""}`}
              onClick={() => {
                if (user.email) {
                  handleAbsenceClick(dateString, user.email, rowIndex, colIndex);
                }
              }}
              tabIndex={0}
              onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex, table: "absence" })}
              title={reason}
            >
              {absent ? (
                <div className={styles.absenceInputContainer}>
                  <input
                    type="text"
                    className={styles.absenceReasonInput}
                    value={reason}
                    placeholder="Reason..."
                    maxLength={20}
                    autoFocus={isFocused}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      if (user.email) {
                        handleAbsenceReasonChange(dateString, user.email, e.target.value);
                      }
                    }}
                  />
                  <button
                    className={styles.removeAbsenceBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (user.email) {
                        handleAbsenceClick(dateString, user.email, rowIndex, colIndex);
                      }
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
        })}
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
        ? (currentPosition.customLabels || []).map((label, colIndex) => {
            const isFocused =
              focusedCell?.row === rowIndex && focusedCell?.col === colIndex && focusedCell?.table === "roster";
            return (
              <td
                key={`custom-cell-${colIndex}`}
                className={`${styles.rosterCell} ${styles.clickable} ${isFocused ? styles.focused : ""}`}
                onClick={() => {
                  if (label) {
                    handleCellClick(dateString, label, rowIndex, colIndex);
                  }
                }}
                tabIndex={0}
                onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex, table: "roster" })}
              >
                {label && getCellContent(dateString, label)}
              </td>
            );
          })
        : sortedUsers.map((user, colIndex) => {
            const isFocused =
              focusedCell?.row === rowIndex && focusedCell?.col === colIndex && focusedCell?.table === "roster";
            const disabled = user.email ? isCellDisabled(dateString, user.email) : false;
            const absent = user.email ? isUserAbsent(dateString, user.email) : false;
            const isAssignedOnClosestDate =
              dateString === closestNextDate && user.email && assignedOnClosestDate.includes(user.email);

            return (
              <Fragment key={user.email}>
                {genderDividerIndex === colIndex && <td className={styles.genderDividerCell} />}
                <td
                  className={`${styles.rosterCell} ${!disabled ? styles.clickable : styles.disabled} ${
                    isFocused ? styles.focused : ""
                  } ${absent ? styles.absentStrike : ""} ${isAssignedOnClosestDate ? styles.highlightedCell : ""}`}
                  onClick={() => {
                    if (user.email && !disabled) {
                      handleCellClick(dateString, user.email, rowIndex, colIndex);
                    }
                  }}
                  tabIndex={0}
                  onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex, table: "roster" })}
                >
                  {user.email &&
                    (absent ? (
                      <span title={getAbsenceReason(dateString, user.email)}>❌</span>
                    ) : (
                      getCellContent(dateString, user.email)
                    ))}
                </td>
              </Fragment>
            );
          })}
      {currentPosition?.isCustom && <td className={`${styles.rosterCell} ${styles.disabled}`} />}
      <td className={styles.genderDividerCell} />
      {renderPeekCell()}
    </tr>
  );
};

export default RosterRow;
