import { useCallback, useEffect, useMemo, useState } from "react";

import { useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import {
  fetchRosterEntries,
  saveRosterChanges,
  updateLocalAssignment,
  resetRosterEdits,
  updateLocalAbsence,
} from "../../store/slices/rosterSlice";
import {
  fetchTeamDataForRoster,
  fetchUsersByTeamAndPosition,
  fetchAllTeamUsers,
} from "../../store/slices/rosterViewSlice";
import Spinner from "../common/Spinner";
import "./roster-table.css";

const RosterTable = () => {
  const dispatch = useAppDispatch();
  const { teamName, positionName: activePosition } = useParams();

  const {
    users,
    allTeamUsers,
    rosterDates,
    loadingUsers,
    loadingTeam,
    loadingAllTeamUsers,
    error: viewError,
  } = useAppSelector((state) => state.rosterView);
  const {
    entries,
    dirtyEntries,
    saving,
    error: rosterError,
  } = useAppSelector((state) => state.roster);
  const { teams: allTeams } = useAppSelector((state) => state.teams);
  const { positions: allPositions } = useAppSelector(
    (state) => state.positions,
  );

  const [focusedCell, setFocusedCell] = useState<{
    row: number;
    col: number;
    table: "roster" | "absence";
  } | null>(null);

  const hasDirtyChanges = Object.keys(dirtyEntries).length > 0;

  const currentPosition = useMemo(
    () => allPositions.find((p) => p.name === activePosition),
    [allPositions, activePosition],
  );

  const sortedUsers = useMemo(() => {
    const list = [...users];
    if (currentPosition?.sortByGender) {
      return list.sort((a, b) => {
        if (a.gender === b.gender) {
          return (a.name || "").localeCompare(b.name || "");
        }
        if (a.gender === "Male") return -1;
        if (b.gender === "Male") return 1;
        return (a.gender || "").localeCompare(b.gender || "");
      });
    }
    return list;
  }, [users, currentPosition]);

  useEffect(() => {
    dispatch(fetchRosterEntries());
  }, [dispatch]);

  useEffect(() => {
    if (activePosition && teamName && activePosition !== "Absence") {
      dispatch(
        fetchUsersByTeamAndPosition({ teamName, positionName: activePosition }),
      );
    }
  }, [activePosition, teamName, dispatch]);

  useEffect(() => {
    if (teamName) {
      dispatch(fetchTeamDataForRoster(teamName));
      dispatch(fetchAllTeamUsers(teamName));
    }
  }, [teamName, dispatch]);

  const isUserAbsent = useCallback(
    (dateString: string, userEmail: string) => {
      const dateKey = dateString.split("T")[0];
      const entry = dirtyEntries[dateKey] || entries[dateKey];
      return !!(entry && entry.absence && entry.absence[userEmail]);
    },
    [dirtyEntries, entries],
  );

  const getAbsenceReason = useCallback(
    (dateString: string, userEmail: string) => {
      const dateKey = dateString.split("T")[0];
      const entry = dirtyEntries[dateKey] || entries[dateKey];
      return entry?.absence?.[userEmail]?.reason || "";
    },
    [dirtyEntries, entries],
  );

  const isCellDisabled = useCallback(
    (dateString: string, userEmail: string) => {
      if (!teamName || !activePosition || activePosition === "Absence")
        return false;

      // 1. Check if user is absent
      if (isUserAbsent(dateString, userEmail)) return true;

      // 2. Check maxConflict
      const dateKey = dateString.split("T")[0];
      const entry = dirtyEntries[dateKey] || entries[dateKey];
      const currentTeam = allTeams.find((t) => t.name === teamName);
      const maxConflict = currentTeam?.maxConflict || 1;

      if (
        !entry ||
        !entry.teams[teamName] ||
        !entry.teams[teamName][userEmail]
      ) {
        return false;
      }

      const userAssignments = entry.teams[teamName][userEmail];

      const children = allPositions.filter(
        (p) => p.parentId === activePosition,
      );
      const positionGroupNames = [
        activePosition,
        ...children.map((c) => c.name),
      ];
      const isInGroup = userAssignments.some((p) =>
        positionGroupNames.includes(p),
      );

      if (isInGroup) return false;

      return userAssignments.length >= maxConflict;
    },
    [
      teamName,
      activePosition,
      isUserAbsent,
      dirtyEntries,
      entries,
      allTeams,
      allPositions,
    ],
  );

  const handleCellClick = useCallback(
    (dateString: string, userEmail: string, row: number, col: number) => {
      if (
        !teamName ||
        !activePosition ||
        activePosition === "Absence" ||
        isCellDisabled(dateString, userEmail)
      ) {
        setFocusedCell({ row, col, table: "roster" });
        return;
      }

      setFocusedCell({ row, col, table: "roster" });

      const currentTeam = allTeams.find((t) => t.name === teamName);
      const maxConflict = currentTeam?.maxConflict || 1;

      // Build the position group: [Parent, Child1, Child2...]
      const children = allPositions.filter(
        (p) => p.parentId === activePosition,
      );
      const positionGroupNames = [
        activePosition,
        ...children.map((c) => c.name),
      ];

      dispatch(
        updateLocalAssignment({
          date: dateString.split("T")[0],
          teamName,
          userIdentifier: userEmail,
          positionGroupNames,
          maxConflict,
        }),
      );
    },
    [
      dispatch,
      teamName,
      activePosition,
      isCellDisabled,
      allTeams,
      allPositions,
    ],
  );

  const handleAbsenceClick = useCallback(
    (dateString: string, userEmail: string, row: number, col: number) => {
      setFocusedCell({ row, col, table: "absence" });
      const isCurrentlyAbsent = isUserAbsent(dateString, userEmail);

      dispatch(
        updateLocalAbsence({
          date: dateString.split("T")[0],
          userIdentifier: userEmail,
          isAbsent: !isCurrentlyAbsent,
        }),
      );
    },
    [dispatch, isUserAbsent],
  );

  const handleAbsenceReasonChange = useCallback(
    (dateString: string, userEmail: string, reason: string) => {
      dispatch(
        updateLocalAbsence({
          date: dateString.split('T')[0],
          userIdentifier: userEmail,
          reason,
          isAbsent: true,
        }),
      );
    },
    [dispatch],
  );

  const handleSave = useCallback(() => {
    dispatch(saveRosterChanges(dirtyEntries));
  }, [dispatch, dirtyEntries]);

  const handleCancel = useCallback(() => {
    dispatch(resetRosterEdits());
    setFocusedCell(null);
  }, [dispatch]);

  const getCellContent = (dateString: string, userEmail: string) => {
    const dateKey = dateString.split('T')[0];
    const entry = dirtyEntries[dateKey] || entries[dateKey];
    if (!entry || !teamName || !entry.teams[teamName] || !entry.teams[teamName][userEmail]) {
      return '-';
    }

    const assignedPositions = entry.teams[teamName][userEmail];

    return (
      <div className="assigned-positions">
        {assignedPositions.map((posName) => {
          const pos = allPositions.find((p) => p.name === posName);
          return (
            <span key={posName} title={posName} className="pos-emoji">
              {pos?.emoji || '❓'}
            </span>
          );
        })}
      </div>
    );
  };

  // Keyboard navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (!focusedCell) return;

      const { row, col, table } = focusedCell;
      const dateList = rosterDates;
      const userList = table === 'roster' ? sortedUsers : allTeamUsers;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (row > 0) setFocusedCell({ row: row - 1, col, table });
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (row < dateList.length - 1) setFocusedCell({ row: row + 1, col, table });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (col > 0) setFocusedCell({ row, col: col - 1, table });
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (col < userList.length - 1) setFocusedCell({ row, col: col + 1, table });
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            if (row > 0) setFocusedCell({ row: row - 1, col, table });
          } else {
            if (row < dateList.length - 1) setFocusedCell({ row: row + 1, col, table });
          }
          break;
        case ' ': {
          e.preventDefault();
          const dStr = rosterDates[row];
          const usr = userList[col];
          if (usr?.email) {
            if (table === 'roster') {
              handleCellClick(dStr, usr.email, row, col);
            } else {
              handleAbsenceClick(dStr, usr.email, row, col);
            }
          }
          break;
        }
        case 'Enter':
          if (hasDirtyChanges) {
            e.preventDefault();
            handleSave();
          }
          break;
        case 'Escape':
          e.preventDefault();
          handleCancel();
          break;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    focusedCell,
    rosterDates,
    sortedUsers,
    allTeamUsers,
    hasDirtyChanges,
    handleCellClick,
    handleAbsenceClick,
    handleSave,
    handleCancel,
  ]);

  if (loadingUsers || loadingTeam || loadingAllTeamUsers) {
    return <Spinner />;
  }

  const error = viewError || rosterError;
  if (error) {
    return <div className="roster-table-error">Error: {error}</div>;
  }

  const isAbsenceView = activePosition === 'Absence';

  if (!isAbsenceView && sortedUsers.length === 0) {
    return <div className="roster-table-loading">No users found for this position.</div>;
  }

  return (
    <div className="roster-table-wrapper">
      {!isAbsenceView ? (
        <div className="roster-section">
          <div className="roster-table-container">
            <table className="roster-table">
              <thead>
                <tr>
                  <th className="roster-table-header-cell sticky-col sticky-header">Date</th>
                  {sortedUsers.map((user) => (
                    <th key={user.email} className="roster-table-header-cell sticky-header">
                      {user.name}
                      {currentPosition?.sortByGender && (
                        <span className="gender-label">
                          ({user.gender === 'Male' ? 'M' : user.gender === 'Female' ? 'F' : '?'})
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rosterDates.map((dateString, rowIndex) => (
                  <tr key={dateString}>
                    <td className="date-cell sticky-col">
                      {new Date(dateString).toLocaleDateString()}
                    </td>
                    {sortedUsers.map((user, colIndex) => {
                      const isFocused =
                        focusedCell?.row === rowIndex &&
                        focusedCell?.col === colIndex &&
                        focusedCell?.table === 'roster';
                      const disabled = user.email ? isCellDisabled(dateString, user.email) : false;
                      const absent = user.email ? isUserAbsent(dateString, user.email) : false;

                      return (
                        <td
                          key={user.email}
                          className={`roster-cell ${!disabled ? 'clickable' : 'disabled'} ${
                            isFocused ? 'focused' : ''
                          } ${absent ? 'absent-strike' : ''}`}
                          onClick={() => {
                            if (user.email && !disabled) {
                              handleCellClick(dateString, user.email, rowIndex, colIndex);
                            }
                          }}
                          tabIndex={0}
                          onFocus={() =>
                            setFocusedCell({ row: rowIndex, col: colIndex, table: 'roster' })
                          }
                        >
                          {user.email &&
                            (absent ? (
                              <span title={getAbsenceReason(dateString, user.email)}>❌</span>
                            ) : (
                              getCellContent(dateString, user.email)
                            ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="roster-section absence-section">
          <h3 className="section-title">Team Absence Overview</h3>
          <div className="roster-table-container">
            <table className="roster-table absence-table">
              <thead>
                <tr>
                  <th className="roster-table-header-cell sticky-col sticky-header">
                    Date
                  </th>
                  {allTeamUsers.map((user) => (
                    <th
                      key={user.email}
                      className="roster-table-header-cell sticky-header"
                    >
                      {user.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rosterDates.map((dateString, rowIndex) => (
                  <tr key={dateString}>
                    <td className="date-cell sticky-col">
                      {new Date(dateString).toLocaleDateString()}
                    </td>
                    {allTeamUsers.map((user, colIndex) => {
                      const isFocused =
                        focusedCell?.row === rowIndex &&
                        focusedCell?.col === colIndex &&
                        focusedCell?.table === "absence";
                      const absent = user.email
                        ? isUserAbsent(dateString, user.email)
                        : false;
                      const reason = user.email
                        ? getAbsenceReason(dateString, user.email)
                        : "";

                      return (
                        <td
                          key={user.email}
                          className={`roster-cell clickable absence-roster-cell ${
                            isFocused ? "focused" : ""
                          } ${absent ? "absent-cell" : ""}`}
                          onClick={() => {
                            if (user.email) {
                              handleAbsenceClick(
                                dateString,
                                user.email,
                                rowIndex,
                                colIndex,
                              );
                            }
                          }}
                          tabIndex={0}
                          onFocus={() =>
                            setFocusedCell({
                              row: rowIndex,
                              col: colIndex,
                              table: "absence",
                            })
                          }
                          title={reason}
                        >
                          {absent ? (
                            <div className="absence-input-container">
                              <input
                                type="text"
                                className="absence-reason-input"
                                value={reason}
                                placeholder="Reason..."
                                maxLength={20}
                                autoFocus={isFocused}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  if (user.email) {
                                    handleAbsenceReasonChange(
                                      dateString,
                                      user.email,
                                      e.target.value,
                                    );
                                  }
                                }}
                              />
                              <button
                                className="remove-absence-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (user.email) {
                                    handleAbsenceClick(
                                      dateString,
                                      user.email,
                                      rowIndex,
                                      colIndex,
                                    );
                                  }
                                }}
                                title="Mark as present"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasDirtyChanges && (
        <div className="roster-save-footer">
          <div className="save-footer-content">
            <span className="changes-label">You have unsaved changes</span>
            <div className="save-footer-actions">
              <button
                className="cancel-btn"
                onClick={handleCancel}
                disabled={saving}
              >
                Discard
              </button>
              <button
                className="save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Roster"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterTable;
