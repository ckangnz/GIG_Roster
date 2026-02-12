import { useCallback, useEffect, useMemo, useState, Fragment } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { getTodayKey } from "../../model/model";
import {
  fetchRosterEntries,
  saveRosterChanges,
  updateLocalAssignment,
  resetRosterEdits,
  updateLocalAbsence,
} from "../../store/slices/rosterSlice";
import {
  fetchAllTeamUsers,
  fetchTeamDataForRoster,
  fetchUsersByTeamAndPosition,
  loadPreviousDates,
  resetToUpcomingDates,
  loadNextYearDates,
} from "../../store/slices/rosterViewSlice";
import { toggleUserVisibility } from "../../store/slices/uiSlice";
import Spinner from "../common/Spinner";
import "./roster-table.css";

const RosterTable = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { teamName, positionName: activePosition } = useParams();

  const {
    users,
    allTeamUsers,
    rosterDates,
    currentTeamData,
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
  const { hiddenUsers } = useAppSelector((state) => state.ui);

  const [focusedCell, setFocusedCell] = useState<{
    row: number;
    col: number;
    table: "roster" | "absence";
  } | null>(null);

  const [peekPositionName, setPeekPositionName] = useState<string | null>(null);

  const hasDirtyChanges = Object.keys(dirtyEntries).length > 0;

  const currentPosition = useMemo(
    () => allPositions.find((p) => p.name === activePosition),
    [allPositions, activePosition],
  );

  const peekOptions = useMemo(() => {
    if (!currentTeamData) return [];
    return currentTeamData.positions.filter((p) => p.name !== activePosition);
  }, [currentTeamData, activePosition]);

  const hiddenUserList = useMemo(() => {
    if (!teamName || !activePosition) return [];
    return hiddenUsers[teamName]?.[activePosition] || [];
  }, [hiddenUsers, teamName, activePosition]);

  const sortedUsers = useMemo(() => {
    const list = users.filter(
      (u) => u.email && !hiddenUserList.includes(u.email) && u.isActive,
    );
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
  }, [users, currentPosition, hiddenUserList]);

  const genderDividerIndex = useMemo(() => {
    if (!currentPosition?.sortByGender || sortedUsers.length === 0) return -1;
    const firstFemaleIndex = sortedUsers.findIndex(
      (u) => u.gender === "Female",
    );
    if (firstFemaleIndex > 0 && firstFemaleIndex < sortedUsers.length) {
      return firstFemaleIndex;
    }
    return -1;
  }, [currentPosition, sortedUsers]);

  const handleToggleVisibility = (userEmail: string) => {
    if (!teamName || !activePosition) return;
    dispatch(
      toggleUserVisibility({
        teamName,
        positionName: activePosition,
        userEmail,
      }),
    );
  };

  const handleLoadPrevious = () => {
    dispatch(loadPreviousDates());
  };

  const handleResetDates = () => {
    dispatch(resetToUpcomingDates());
  };

  const handleLoadNextYear = () => {
    dispatch(loadNextYearDates());
  };

  const handleDateClick = (dateString: string) => {
    if (checkHasAssignments(dateString)) {
      navigate(`/app/dashboard?date=${dateString}`);
    }
  };

  const checkHasAssignments = useCallback(
    (dateString: string) => {
      const dateKey = dateString.split("T")[0];
      const entry = dirtyEntries[dateKey] || entries[dateKey];
      if (!entry) return false;

      // Check if any team has any assignment
      return Object.values(entry.teams).some((teamAssignments) =>
        Object.values(teamAssignments).some((posList) => posList.length > 0),
      );
    },
    [entries, dirtyEntries],
  );

  const getPeekAssignedUsers = useCallback(
    (dateString: string) => {
      if (!peekPositionName || !teamName) return [];
      const dateKey = dateString.split("T")[0];
      const entry = dirtyEntries[dateKey] || entries[dateKey];
      if (!entry || !entry.teams[teamName]) return [];

      return Object.entries(entry.teams[teamName])
        .filter(([, assignments]) => assignments.includes(peekPositionName))
        .map(([email]) => {
          const user = allTeamUsers.find((u) => u.email === email);
          return user?.name || email;
        });
    },
    [peekPositionName, teamName, dirtyEntries, entries, allTeamUsers],
  );

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
      const dateKey = dateString;
      const entry = dirtyEntries[dateKey] || entries[dateKey];
      return !!(entry && entry.absence && entry.absence[userEmail]);
    },
    [dirtyEntries, entries],
  );

  const getAbsenceReason = useCallback(
    (dateString: string, userEmail: string) => {
      const dateKey = dateString;
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
      const dateKey = dateString;
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
          date: dateString,
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
          date: dateString,
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
          date: dateString,
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
    const dateKey = dateString;
    const entry = dirtyEntries[dateKey] || entries[dateKey];
    if (!entry || !teamName) {
      return "";
    }

    // Current team assignments
    const currentTeamAssignments = entry.teams[teamName]?.[userEmail] || [];

    // Other teams assignments
    const otherTeamsAssignments: { team: string; positions: string[] }[] = [];
    Object.entries(entry.teams).forEach(([tName, teamData]) => {
      if (tName !== teamName && teamData[userEmail]) {
        otherTeamsAssignments.push({
          team: tName,
          positions: teamData[userEmail],
        });
      }
    });

    if (
      currentTeamAssignments.length === 0 &&
      otherTeamsAssignments.length === 0
    ) {
      return "";
    }

    return (
      <div className="assigned-positions">
        {currentTeamAssignments.map((posName) => {
          const pos = allPositions.find((p) => p.name === posName);
          return (
            <span
              key={posName}
              title={`${teamName}: ${posName}`}
              className="pos-emoji"
            >
              {pos?.emoji || "❓"}
            </span>
          );
        })}
        {otherTeamsAssignments.map((ota) =>
          ota.positions.map((posName) => {
            const pos = allPositions.find((p) => p.name === posName);
            return (
              <span
                key={`${ota.team}-${posName}`}
                title={`${ota.team}: ${posName}`}
                className="pos-emoji other-team-emoji"
              >
                {pos?.emoji || "❓"}
              </span>
            );
          }),
        )}
      </div>
    );
  };

  // Keyboard navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      if (!focusedCell) return;

      const { row, col, table } = focusedCell;
      const dateList = rosterDates;
      const userList = table === "roster" ? sortedUsers : allTeamUsers;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          if (row > 0) setFocusedCell({ row: row - 1, col, table });
          break;
        case "ArrowDown":
          e.preventDefault();
          if (row < dateList.length - 1)
            setFocusedCell({ row: row + 1, col, table });
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (col > 0) setFocusedCell({ row, col: col - 1, table });
          break;
        case "ArrowRight":
          e.preventDefault();
          if (col < userList.length - 1)
            setFocusedCell({ row, col: col + 1, table });
          break;
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            if (row > 0) setFocusedCell({ row: row - 1, col, table });
          } else {
            if (row < dateList.length - 1)
              setFocusedCell({ row: row + 1, col, table });
          }
          break;
        case " ": {
          e.preventDefault();
          const dStr = rosterDates[row];
          const usr = userList[col];
          if (usr?.email) {
            if (table === "roster") {
              handleCellClick(dStr, usr.email, row, col);
            } else {
              handleAbsenceClick(dStr, usr.email, row, col);
            }
          }
          break;
        }
        case "Enter":
          if (hasDirtyChanges) {
            e.preventDefault();
            handleSave();
          }
          break;
        case "Escape":
          if (hasDirtyChanges) {
            e.preventDefault();
            handleCancel();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
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

  const hasPastDates = useMemo(() => {
    const todayKey = getTodayKey();

    if (rosterDates.length === 0) return false;

    return rosterDates[0] < todayKey;
  }, [rosterDates]);

  const closestNextDate = useMemo(() => {
    const todayKey = getTodayKey();

    return rosterDates.find((d) => d.split("T")[0] >= todayKey);
  }, [rosterDates]);

  const assignedOnClosestDate = useMemo(() => {
    if (!closestNextDate || !teamName || !activePosition) return [];

    const dateKey = closestNextDate.split("T")[0];

    const entry = dirtyEntries[dateKey] || entries[dateKey];

    if (!entry || !entry.teams[teamName]) return [];

    const children = allPositions.filter((p) => p.parentId === activePosition);

    const positionGroupNames = [activePosition, ...children.map((c) => c.name)];

    return Object.entries(entry.teams[teamName])

      .filter(([, positions]) =>
        positions.some((p) => positionGroupNames.includes(p)),
      )

      .map(([email]) => email);
  }, [
    closestNextDate,

    teamName,

    activePosition,

    dirtyEntries,

    entries,

    allPositions,
  ]);

  const getRowClass = useCallback((dateString: string) => {
    const todayKey = getTodayKey();
    const dateKey = dateString.split("T")[0];
    if (dateKey < todayKey) return "past-date";
    if (dateKey === todayKey) return "today-date";
    return "future-date";
  }, []);

  if (loadingUsers || loadingTeam || loadingAllTeamUsers) {
    return <Spinner />;
  }

  const error = viewError || rosterError;
  if (error) {
    return <div className="roster-table-error">Error: {error}</div>;
  }

  const isAbsenceView = activePosition === "Absence";

  if (!isAbsenceView && sortedUsers.length === 0) {
    return (
      <div className="roster-table-loading">
        {!isAbsenceView && hiddenUserList.length > 0 && (
          <div className="hidden-members-bar">
            <span className="hidden-members-label">Hidden Members:</span>
            <div className="hidden-members-list">
              {hiddenUserList.map((email) => {
                const user = users.find((u) => u.email === email);
                return (
                  <button
                    key={email}
                    className="unhide-pill"
                    onClick={() => handleToggleVisibility(email)}
                    title="Click to unhide"
                  >
                    {user?.name || email} <span>+</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        No users found for this position.
      </div>
    );
  }

  return (
    <div className="roster-table-wrapper">
      {!isAbsenceView && hiddenUserList.length > 0 && (
        <div className="hidden-members-bar">
          <span className="hidden-members-label">Hidden Members:</span>
          <div className="hidden-members-list">
            {hiddenUserList.map((email) => {
              const user = users.find((u) => u.email === email);
              return (
                <button
                  key={email}
                  className="unhide-pill"
                  onClick={() => handleToggleVisibility(email)}
                  title="Click to unhide"
                >
                  {user?.name || email} <span>+</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!isAbsenceView ? (
        <div className="roster-section">
          <div className="roster-table-container">
            <table className="roster-table">
              <thead>
                <tr>
                  <th className="roster-table-header-cell sticky-col sticky-header">
                    <div className="date-header-content">
                      Date
                      <div className="date-header-actions">
                        <button
                          className="load-prev-btn"
                          onClick={handleLoadPrevious}
                          title="Load 5 previous dates"
                        >
                          ↑
                        </button>
                        {hasPastDates && (
                          <button
                            className="load-prev-btn reset-dates-btn"
                            onClick={handleResetDates}
                            title="Hide previous dates"
                          >
                            ↓
                          </button>
                        )}
                      </div>
                    </div>
                  </th>
                  {sortedUsers.map((user, colIndex) => (
                    <Fragment key={user.email}>
                      {genderDividerIndex === colIndex && (
                        <th className="gender-divider-cell sticky-header" />
                      )}
                      <th
                        className={`roster-table-header-cell sticky-header clickable-header ${
                          user.email &&
                          assignedOnClosestDate.includes(user.email)
                            ? "highlighted-header"
                            : ""
                        }`}
                        onClick={() =>
                          user.email && handleToggleVisibility(user.email)
                        }
                        title="Click to hide member"
                      >
                        {user.name}

                        {currentPosition?.sortByGender && (
                          <span className="gender-label">
                            (
                            {user.gender === "Male"
                              ? "M"
                              : user.gender === "Female"
                                ? "F"
                                : "?"}
                            )
                          </span>
                        )}
                      </th>
                    </Fragment>
                  ))}
                  <th className="gender-divider-cell sticky-header" />
                  <th className="roster-table-header-cell sticky-header sticky-right peek-header">
                    <select
                      className="peek-selector"
                      value={peekPositionName || ""}
                      onChange={(e) =>
                        setPeekPositionName(e.target.value || null)
                      }
                    >
                      <option value="">Peek Position...</option>
                      {peekOptions.map((opt) => (
                        <option key={opt.name} value={opt.name}>
                          {opt.emoji} {opt.name}
                        </option>
                      ))}
                    </select>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rosterDates.map((dateString, rowIndex) => {
                  const dateKey = dateString.split("T")[0];
                  const entry = dirtyEntries[dateKey] || entries[dateKey];
                  const eventName = entry?.eventName;

                  const rowClass = getRowClass(dateString);
                  const isToday = rowClass === "today-date";
                  const hasData = checkHasAssignments(dateString);
                  return (
                    <tr
                      key={dateString}
                      className={`${rowClass} ${!hasData ? "no-data" : ""} ${
                        eventName ? "special-event-row" : ""
                      } ${dateString === closestNextDate ? "closest-next-date-row" : ""}`}
                    >
                      <td
                        className={`date-cell sticky-col ${hasData ? "clickable" : ""}`}
                        onClick={() => handleDateClick(dateString)}
                        title={eventName}
                      >
                        <div className="date-cell-content">
                          {eventName && <span className="special-event-dot" />}
                          {isToday && (
                            <span className="roster-today-dot" title="Today" />
                          )}
                          {new Date(
                            dateString.replace(/-/g, "/"),
                          ).toLocaleDateString()}
                        </div>
                      </td>
                      {sortedUsers.map((user, colIndex) => {
                        const isFocused =
                          focusedCell?.row === rowIndex &&
                          focusedCell?.col === colIndex &&
                          focusedCell?.table === "roster";
                        const disabled = user.email
                          ? isCellDisabled(dateString, user.email)
                          : false;
                        const absent = user.email
                          ? isUserAbsent(dateString, user.email)
                          : false;
                        const isAssignedOnClosestDate =
                          dateString === closestNextDate &&
                          user.email &&
                          assignedOnClosestDate.includes(user.email);

                        return (
                          <Fragment key={user.email}>
                            {genderDividerIndex === colIndex && (
                              <td className="gender-divider-cell" />
                            )}
                            <td
                              className={`roster-cell ${!disabled ? "clickable" : "disabled"} ${
                                isFocused ? "focused" : ""
                              } ${absent ? "absent-strike" : ""} ${
                                isAssignedOnClosestDate
                                  ? "highlighted-cell"
                                  : ""
                              }`}
                              onClick={() => {
                                if (user.email && !disabled) {
                                  handleCellClick(
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
                                  table: "roster",
                                })
                              }
                            >
                              {user.email &&
                                (absent ? (
                                  <span
                                    title={getAbsenceReason(
                                      dateString,
                                      user.email,
                                    )}
                                  >
                                    ❌
                                  </span>
                                ) : (
                                  getCellContent(dateString, user.email)
                                ))}
                            </td>
                          </Fragment>
                        );
                      })}
                      <td className="gender-divider-cell" />
                      <td className="roster-cell peek-cell sticky-right">
                        {getPeekAssignedUsers(dateString).join(", ") || ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="load-more-footer">
            <button className="load-next-year-btn" onClick={handleLoadNextYear}>
              Load Next Year ↓
            </button>
          </div>
        </div>
      ) : (
        <div className="roster-section absence-section">
          <div className="roster-table-container">
            <table className="roster-table absence-table">
              <thead>
                <tr>
                  <th className="roster-table-header-cell sticky-col sticky-header">
                    <div className="date-header-content">
                      Date
                      <div className="date-header-actions">
                        <button
                          className="load-prev-btn"
                          onClick={handleLoadPrevious}
                          title="Load 5 previous dates"
                        >
                          ↑
                        </button>
                        {hasPastDates && (
                          <button
                            className="load-prev-btn reset-dates-btn"
                            onClick={handleResetDates}
                            title="Hide previous dates"
                          >
                            ↓
                          </button>
                        )}
                      </div>
                    </div>
                  </th>
                  {allTeamUsers.map((user) => (
                    <th
                      key={user.email}
                      className={`roster-table-header-cell sticky-header ${
                        user.email && assignedOnClosestDate.includes(user.email)
                          ? "highlighted-header"
                          : ""
                      }`}
                    >
                      {user.name}
                    </th>
                  ))}

                  <th className="gender-divider-cell sticky-header" />
                  <th className="roster-table-header-cell sticky-header sticky-right peek-header">
                    <select
                      className="peek-selector"
                      value={peekPositionName || ""}
                      onChange={(e) =>
                        setPeekPositionName(e.target.value || null)
                      }
                    >
                      <option value="">Peek Position...</option>
                      {peekOptions.map((opt) => (
                        <option key={opt.name} value={opt.name}>
                          {opt.emoji} {opt.name}
                        </option>
                      ))}
                    </select>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rosterDates.map((dateString, rowIndex) => {
                  const dateKey = dateString.split("T")[0];
                  const entry = dirtyEntries[dateKey] || entries[dateKey];
                  const eventName = entry?.eventName;

                  const rowClass = getRowClass(dateString);
                  const isToday = rowClass === "today-date";
                  const hasData = checkHasAssignments(dateString);
                  return (
                    <tr
                      key={dateString}
                      className={`${rowClass} ${!hasData ? "no-data" : ""} ${
                        eventName ? "special-event-row" : ""
                      } ${dateString === closestNextDate ? "closest-next-date-row" : ""}`}
                    >
                      <td
                        className={`date-cell sticky-col ${hasData ? "clickable" : ""}`}
                        onClick={() => handleDateClick(dateString)}
                        title={eventName}
                      >
                        <div className="date-cell-content">
                          {eventName && <span className="special-event-dot" />}
                          {new Date(
                            dateString.replace(/-/g, "/"),
                          ).toLocaleDateString()}
                          {isToday && (
                            <span className="roster-today-dot" title="Today" />
                          )}
                        </div>
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
                        const isAssignedOnClosestDate =
                          dateString === closestNextDate &&
                          user.email &&
                          assignedOnClosestDate.includes(user.email);

                        return (
                          <td
                            key={user.email}
                            className={`roster-cell clickable absence-roster-cell ${
                              isFocused ? "focused" : ""
                            } ${absent ? "absent-cell" : ""} ${
                              isAssignedOnClosestDate ? "highlighted-cell" : ""
                            }`}
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
                              ""
                            )}
                          </td>
                        );
                      })}
                      <td className="gender-divider-cell" />
                      <td className="roster-cell peek-cell sticky-right">
                        {getPeekAssignedUsers(dateString).join(", ") || ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="load-more-footer">
            <button className="load-next-year-btn" onClick={handleLoadNextYear}>
              Load Next Year ↓
            </button>
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
