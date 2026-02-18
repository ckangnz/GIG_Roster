import { useCallback, useEffect, useMemo, useState, Fragment } from "react";

import {
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import TopControls from "./TopControls";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { getTodayKey, AppUser, Position } from "../../model/model";
import {
  updatePositionCustomLabels,
  updatePositions,
  resetPositionsDirty,
  fetchPositions,
} from "../../store/slices/positionsSlice";
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
import {
  toggleUserVisibility,
} from "../../store/slices/uiSlice";
import SaveFooter from "../common/SaveFooter";
import Spinner from "../common/Spinner";

import styles from "./roster-table.module.css";

const RosterTable = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { teamName, positionName: activePosition } = useParams();

  const { userData } = useAppSelector((state) => state.auth);
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
  const { positions: allPositions, isDirty: positionsDirty } = useAppSelector(
    (state) => state.positions,
  );
  const { teams: allTeams } = useAppSelector((state) => state.teams);
  const { hiddenUsers, rosterAllViewMode } = useAppSelector(
    (state) => state.ui,
  );

  const [focusedCell, setFocusedCell] = useState<{
    row: number;
    col: number;
    table: "roster" | "absence" | "all";
  } | null>(null);

  const [peekPositionName, setPeekPositionName] = useState<string | null>(null);

  const hasRosterChanges = Object.keys(dirtyEntries).length > 0;
  const hasDirtyChanges = hasRosterChanges || positionsDirty;

  const isAbsenceView = activePosition === "Absence";
  const isAllView = activePosition === "All";

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

  const filteredAllTeamUsers = useMemo(() => {
    return allTeamUsers.filter((u) => {
      if (!u.isActive || !teamName) return false;
      const userTeamPositions = u.teamPositions?.[teamName] || [];
      return userTeamPositions.length > 0;
    });
  }, [allTeamUsers, teamName]);

  const allViewColumns = useMemo(() => {
    const userCols = filteredAllTeamUsers.map((u) => ({
      id: u.email || "",
      name: u.name || "",
      isUser: true,
      gender: u.gender,
    }));

    if (!currentTeamData) return userCols;

    const teamPositionNames = currentTeamData.positions.map((p) => p.name);

    const customLabels = Array.from(
      new Set(
        allPositions
          .filter((p) => teamPositionNames.includes(p.name) && p.isCustom)
          .flatMap((p) => p.customLabels || [])
          .map((l) => l.trim())
          .filter((l) => l !== ""),
      ),
    ).map((l) => ({ id: l, name: l, isUser: false }));

    return [...userCols, ...customLabels];
  }, [filteredAllTeamUsers, currentTeamData, allPositions]);

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
    if (
      activePosition &&
      teamName &&
      !["Absence", "All"].includes(activePosition)
    ) {
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
    if (hasRosterChanges) {
      dispatch(saveRosterChanges(dirtyEntries));
    }
    if (positionsDirty) {
      dispatch(updatePositions(allPositions));
    }
  }, [dispatch, dirtyEntries, allPositions, hasRosterChanges, positionsDirty]);

  const handleAddCustomLabel = () => {
    if (!currentPosition || !activePosition) return;
    const currentLabels = currentPosition.customLabels || [];
    dispatch(
      updatePositionCustomLabels({
        positionName: activePosition,
        labels: [...currentLabels, ""],
      }),
    );
  };

  const handleUpdateCustomLabel = (index: number, value: string) => {
    if (!currentPosition || !activePosition) return;
    const currentLabels = [...(currentPosition.customLabels || [])];
    currentLabels[index] = value;
    dispatch(
      updatePositionCustomLabels({
        positionName: activePosition,
        labels: currentLabels,
      }),
    );
  };

  const handleMoveCustomLabel = (
    index: number,
    direction: "left" | "right",
  ) => {
    if (!currentPosition || !activePosition) return;
    const currentLabels = [...(currentPosition.customLabels || [])];
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentLabels.length) return;

    const temp = currentLabels[index];
    currentLabels[index] = currentLabels[targetIndex];
    currentLabels[targetIndex] = temp;

    dispatch(
      updatePositionCustomLabels({
        positionName: activePosition,
        labels: currentLabels,
      }),
    );
  };

  const handleRemoveCustomLabel = (index: number) => {
    if (!currentPosition || !activePosition) return;
    if (!window.confirm("Remove this column?")) return;
    const currentLabels = [...(currentPosition.customLabels || [])];
    currentLabels.splice(index, 1);
    dispatch(
      updatePositionCustomLabels({
        positionName: activePosition,
        labels: currentLabels,
      }),
    );
  };

  const handleCancel = useCallback(() => {
    if (hasRosterChanges) {
      dispatch(resetRosterEdits());
    }
    if (positionsDirty) {
      dispatch(resetPositionsDirty());
      // Refresh positions from server to discard local changes
      dispatch(fetchPositions());
    }
    setFocusedCell(null);
  }, [dispatch, hasRosterChanges, positionsDirty]);

  const getAssignmentsForIdentifier = (
    dateString: string,
    identifier: string,
  ) => {
    const dateKey = dateString.split("T")[0];
    const entry = dirtyEntries[dateKey] || entries[dateKey];
    if (!entry || !teamName || !entry.teams[teamName]) return [];

    let assignments = entry.teams[teamName][identifier] || [];
    if (assignments.length === 0) {
      const target = identifier.trim();
      const matchingKey = Object.keys(entry.teams[teamName]).find(
        (k) => k.trim() === target,
      );
      if (matchingKey) {
        assignments = entry.teams[teamName][matchingKey];
      }
    }
    return assignments;
  };

  const getAllViewUserCellContent = (
    dateString: string,
    userIdentifier: string,
  ) => {
    const userAssignments = getAssignmentsForIdentifier(
      dateString,
      userIdentifier,
    );
    if (userAssignments.length === 0) return "";

    return (
      <div className={styles.assignedPositions}>
        {userAssignments.map((posName) => {
          const pos = allPositions.find((p) => p.name === posName);
          return (
            <span
              key={posName}
              className={styles.posEmoji}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/app/roster/${teamName}/${posName}`);
              }}
              title={posName}
              style={{ cursor: "pointer" }}
            >
              {pos?.emoji || "❓"}
            </span>
          );
        })}
      </div>
    );
  };

  const getAllViewPositionCellContent = (
    dateString: string,
    positionName: string,
  ) => {
    const dateKey = dateString.split("T")[0];
    const entry = dirtyEntries[dateKey] || entries[dateKey];
    if (!entry || !teamName) return "";

    const assignedEntries = Object.entries(entry.teams[teamName] || {}).filter(
      ([, positions]) => positions.includes(positionName),
    );

    return (
      <div className={styles.assignedUsersText}>
        {assignedEntries.map(([id], idx) => {
          const user = filteredAllTeamUsers.find((u) => u.email === id);
          const isMe = id === userData?.email;
          const displayName = user ? user.name : id;

          return (
            <Fragment key={id}>
              <span className={isMe ? styles.isMe : ""}>{displayName}</span>
              {isMe && <span className={styles.meTag}>Me</span>}
              {idx < assignedEntries.length - 1 ? ", " : ""}
            </Fragment>
          );
        })}
      </div>
    );
  };

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
      <div className={styles.assignedPositions}>
        {currentTeamAssignments.map((posName) => {
          const pos = allPositions.find((p) => p.name === posName);
          return (
            <span
              key={posName}
              title={`${teamName}: ${posName}`}
              className={styles.posEmoji}
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
                className={`${styles.posEmoji} ${styles.otherTeamEmoji}`}
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
      let userList: (
        | AppUser
        | Position
        | { id: string; name: string; isUser: boolean }
      )[] = [];
      if (table === "roster") userList = sortedUsers;
      else if (table === "absence") userList = allTeamUsers;
      else if (table === "all") {
        userList =
          rosterAllViewMode === "user"
            ? allViewColumns
            : currentTeamData?.positions || [];
      }

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
          if (table === "all") break;
          const dStr = rosterDates[row];
          const usr = userList[col] as AppUser;
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
    rosterAllViewMode,
    allViewColumns,
    currentTeamData?.positions,
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
    return <div className={styles.rosterTableError}>Error: {error}</div>;
  }

  if (isAllView) {
    return (
      <div className={styles.rosterTableWrapper}>
        <TopControls
          isAllView={isAllView}
          isAbsenceView={isAbsenceView}
          rosterAllViewMode={rosterAllViewMode}
          hiddenUserList={hiddenUserList}
          allUsers={users}
          onToggleVisibility={handleToggleVisibility}
        />

        <div className={styles.rosterSection}>
          <div className={styles.rosterTableContainer}>
            <table className={styles.rosterTable}>
              <thead>
                <tr>
                  <th
                    className={`${styles.rosterTableHeaderCell} ${styles.stickyCol} sticky-header`}
                  >
                    <div className={styles.dateHeaderContent}>
                      Date
                      <div className={styles.dateHeaderActions}>
                        <button
                          className={styles.loadPrevBtn}
                          onClick={handleLoadPrevious}
                          title="Load 5 previous dates"
                        >
                          ↑
                        </button>
                        {hasPastDates && (
                          <button
                            className={`${styles.loadPrevBtn} ${styles.resetDatesBtn}`}
                            onClick={handleResetDates}
                            title="Hide previous dates"
                          >
                            ↓
                          </button>
                        )}
                      </div>
                    </div>
                  </th>
                  {rosterAllViewMode === "user"
                    ? allViewColumns.map((col) => {
                        const isMe = col.id === userData?.email;
                        return (
                          <th
                            key={col.id}
                            className={`${styles.rosterTableHeaderCell} sticky-header ${
                              col.id && assignedOnClosestDate.includes(col.id)
                                ? styles.highlightedHeader
                                : ""
                            } ${isMe ? styles.isMe : ""}`}
                          >
                            {col.name}
                            {isMe && <span className={styles.meTag}>Me</span>}
                          </th>
                        );
                      })
                    : (currentTeamData?.positions || []).map((pos) => (
                        <th
                          key={pos.name}
                          className={`${styles.rosterTableHeaderCell} ${styles.clickableHeader} sticky-header`}
                          onClick={() =>
                            navigate(`/app/roster/${teamName}/${pos.name}`)
                          }
                        >
                          <div className={styles.allViewPositionHeader}>
                            <span>{pos.emoji}</span>
                            <span className={styles.allViewPositionName}>
                              {pos.name}
                            </span>
                          </div>
                        </th>
                      ))}
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

                  const trClasses = [
                    rowClass === "past-date" ? styles.pastDate : "",
                    rowClass === "today-date" ? styles.todayDate : "",
                    rowClass === "future-date" ? styles.futureDate : "",
                    !hasData ? styles.noData : "",
                    eventName ? styles.specialEventRow : "",
                    dateString === closestNextDate
                      ? styles.closestNextDateRow
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr key={dateString} className={trClasses}>
                      <td
                        className={`${styles.dateCell} ${styles.stickyCol} ${hasData ? styles.clickable : ""}`}
                        onClick={() => handleDateClick(dateString)}
                        title={eventName}
                      >
                        <div className={styles.dateCellContent}>
                          {eventName && (
                            <span className={styles.specialEventDot} />
                          )}
                          {isToday && (
                            <span
                              className={styles.rosterTodayDot}
                              title="Today"
                            />
                          )}
                          {new Date(
                            dateString.replace(/-/g, "/"),
                          ).toLocaleDateString()}
                        </div>
                      </td>
                      {rosterAllViewMode === "user"
                        ? allViewColumns.map((col, colIndex) => {
                            const isFocused =
                              focusedCell?.row === rowIndex &&
                              focusedCell?.col === colIndex &&
                              focusedCell?.table === "all";
                            const absent = col.id
                              ? isUserAbsent(dateString, col.id)
                              : false;
                            const isAssignedOnClosestDate =
                              dateString === closestNextDate &&
                              col.id &&
                              assignedOnClosestDate.includes(col.id);

                            return (
                              <td
                                key={col.id}
                                className={`${styles.rosterCell} ${styles.clickable} ${
                                  isFocused ? styles.focused : ""
                                } ${absent ? styles.absentStrike : ""} ${
                                  isAssignedOnClosestDate
                                    ? styles.highlightedCell
                                    : ""
                                }`}
                                tabIndex={0}
                                onClick={() => {
                                  const assignments =
                                    getAssignmentsForIdentifier(
                                      dateString,
                                      col.id,
                                    );
                                  if (assignments.length > 0) {
                                    navigate(
                                      `/app/roster/${teamName}/${assignments[0]}`,
                                    );
                                  }
                                }}
                                onFocus={() =>
                                  setFocusedCell({
                                    row: rowIndex,
                                    col: colIndex,
                                    table: "all",
                                  })
                                }
                              >
                                {col.id &&
                                  (absent ? (
                                    <span
                                      title={getAbsenceReason(
                                        dateString,
                                        col.id,
                                      )}
                                    >
                                      ❌
                                    </span>
                                  ) : (
                                    getAllViewUserCellContent(
                                      dateString,
                                      col.id,
                                    )
                                  ))}
                              </td>
                            );
                          })
                        : (currentTeamData?.positions || []).map(
                            (pos, colIndex) => {
                              const isFocused =
                                focusedCell?.row === rowIndex &&
                                focusedCell?.col === colIndex &&
                                focusedCell?.table === "all";

                              return (
                                <td
                                  key={pos.name}
                                  className={`${styles.rosterCell} ${
                                    isFocused ? styles.focused : ""
                                  }`}
                                  tabIndex={0}
                                  onFocus={() =>
                                    setFocusedCell({
                                      row: rowIndex,
                                      col: colIndex,
                                      table: "all",
                                    })
                                  }
                                >
                                  {getAllViewPositionCellContent(
                                    dateString,
                                    pos.name,
                                  )}
                                </td>
                              );
                            },
                          )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={styles.loadMoreFooter}>
            <button
              className={styles.loadNextYearBtn}
              onClick={handleLoadNextYear}
            >
              Load Next Year ↓
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (
    !isAbsenceView &&
    !currentPosition?.isCustom &&
    sortedUsers.length === 0
  ) {
    return (
      <div className={styles.rosterTableWrapper}>
        <TopControls
          isAllView={isAllView}
          isAbsenceView={isAbsenceView}
          rosterAllViewMode={rosterAllViewMode}
          hiddenUserList={hiddenUserList}
          allUsers={users}
          onToggleVisibility={handleToggleVisibility}
        />
        <div className={styles.rosterTableLoading}>
          No users found for this position.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.rosterTableWrapper}>
      <TopControls
        isAllView={isAllView}
        isAbsenceView={isAbsenceView}
        rosterAllViewMode={rosterAllViewMode}
        hiddenUserList={hiddenUserList}
        allUsers={users}
        onToggleVisibility={handleToggleVisibility}
      />

      {!isAbsenceView ? (
        <div className={styles.rosterSection}>
          <div className={styles.rosterTableContainer}>
            <table className={styles.rosterTable}>
              <thead>
                <tr>
                  <th
                    className={`${styles.rosterTableHeaderCell} ${styles.stickyCol} sticky-header`}
                  >
                    <div className={styles.dateHeaderContent}>
                      Date
                      <div className={styles.dateHeaderActions}>
                        <button
                          className={styles.loadPrevBtn}
                          onClick={handleLoadPrevious}
                          title="Load 5 previous dates"
                        >
                          ↑
                        </button>
                        {hasPastDates && (
                          <button
                            className={`${styles.loadPrevBtn} ${styles.resetDatesBtn}`}
                            onClick={handleResetDates}
                            title="Hide previous dates"
                          >
                            ↓
                          </button>
                        )}
                      </div>
                    </div>
                  </th>
                  {currentPosition?.isCustom
                    ? (currentPosition.customLabels || []).map(
                        (label, index) => (
                          <th
                            key={`custom-${index}`}
                            className={`${styles.rosterTableHeaderCell} sticky-header`}
                          >
                            <input
                              type="text"
                              className={styles.headerInput}
                              value={label}
                              placeholder="New Heading..."
                              readOnly={!userData?.isAdmin}
                              onChange={(e) =>
                                handleUpdateCustomLabel(index, e.target.value)
                              }
                            />
                            {userData?.isAdmin && (
                              <div className={styles.headerActions}>
                                <button
                                  className={styles.headerActionBtn}
                                  onClick={() =>
                                    handleMoveCustomLabel(index, "left")
                                  }
                                  disabled={index === 0}
                                  title="Move Left"
                                >
                                  <ArrowLeft size={12} />
                                </button>
                                <button
                                  className={`${styles.headerActionBtn} ${styles.removeHeaderBtn}`}
                                  onClick={() => handleRemoveCustomLabel(index)}
                                  title="Remove Column"
                                >
                                  <X size={12} />
                                </button>
                                <button
                                  className={styles.headerActionBtn}
                                  onClick={() =>
                                    handleMoveCustomLabel(index, "right")
                                  }
                                  disabled={
                                    index ===
                                    (currentPosition.customLabels?.length ||
                                      0) -
                                      1
                                  }
                                  title="Move Right"
                                >
                                  <ArrowRight size={12} />
                                </button>
                              </div>
                            )}
                          </th>
                        ),
                      )
                    : sortedUsers.map((user, colIndex) => (
                        <Fragment key={user.email}>
                          {genderDividerIndex === colIndex && (
                            <th
                              className={`${styles.genderDividerCell} sticky-header`}
                            />
                          )}
                          <th
                            className={`${styles.rosterTableHeaderCell} sticky-header ${styles.clickableHeader} ${
                              user.email &&
                              assignedOnClosestDate.includes(user.email)
                                ? styles.highlightedHeader
                                : ""
                            }`}
                            onClick={() =>
                              user.email && handleToggleVisibility(user.email)
                            }
                            title="Click to hide member"
                          >
                            {user.name}

                            {currentPosition?.sortByGender && (
                              <span className={styles.genderLabel}>
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
                  {currentPosition?.isCustom && userData?.isAdmin && (
                    <th
                      className={`${styles.rosterTableHeaderCell} sticky-header`}
                    >
                      <button
                        className={styles.addColumnBtn}
                        onClick={handleAddCustomLabel}
                        title="Add Column"
                      >
                        <Plus size={16} />
                      </button>
                    </th>
                  )}
                  <th className={`${styles.genderDividerCell} sticky-header`} />
                  <th
                    className={`${styles.rosterTableHeaderCell} sticky-header ${styles.stickyRight} ${styles.peekHeader}`}
                  >
                    <select
                      className={styles.peekSelector}
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

                  const trClasses = [
                    rowClass === "past-date" ? styles.pastDate : "",
                    rowClass === "today-date" ? styles.todayDate : "",
                    rowClass === "future-date" ? styles.futureDate : "",
                    !hasData ? styles.noData : "",
                    eventName ? styles.specialEventRow : "",
                    dateString === closestNextDate
                      ? styles.closestNextDateRow
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr key={dateString} className={trClasses}>
                      <td
                        className={`${styles.dateCell} ${styles.stickyCol} ${hasData ? styles.clickable : ""}`}
                        onClick={() => handleDateClick(dateString)}
                        title={eventName}
                      >
                        <div className={styles.dateCellContent}>
                          {eventName && (
                            <span className={styles.specialEventDot} />
                          )}
                          {isToday && (
                            <span
                              className={styles.rosterTodayDot}
                              title="Today"
                            />
                          )}
                          {new Date(
                            dateString.replace(/-/g, "/"),
                          ).toLocaleDateString()}
                        </div>
                      </td>
                      {currentPosition?.isCustom
                        ? (currentPosition.customLabels || []).map(
                            (label, colIndex) => {
                              const isFocused =
                                focusedCell?.row === rowIndex &&
                                focusedCell?.col === colIndex &&
                                focusedCell?.table === "roster";
                              return (
                                <td
                                  key={`custom-cell-${colIndex}`}
                                  className={`${styles.rosterCell} ${styles.clickable} ${isFocused ? styles.focused : ""}`}
                                  onClick={() => {
                                    if (label) {
                                      handleCellClick(
                                        dateString,
                                        label,
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
                                  {label && getCellContent(dateString, label)}
                                </td>
                              );
                            },
                          )
                        : sortedUsers.map((user, colIndex) => {
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
                                  <td className={styles.genderDividerCell} />
                                )}
                                <td
                                  className={`${styles.rosterCell} ${!disabled ? styles.clickable : styles.disabled} ${
                                    isFocused ? styles.focused : ""
                                  } ${absent ? styles.absentStrike : ""} ${
                                    isAssignedOnClosestDate
                                      ? styles.highlightedCell
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
                      {currentPosition?.isCustom && (
                        <td
                          className={`${styles.rosterCell} ${styles.disabled}`}
                        />
                      )}
                      <td className={styles.genderDividerCell} />
                      <td
                        className={`${styles.rosterCell} ${styles.peekCell} ${styles.stickyRight}`}
                      >
                        {getPeekAssignedUsers(dateString).join(", ") || ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={styles.loadMoreFooter}>
            <button
              className={styles.loadNextYearBtn}
              onClick={handleLoadNextYear}
            >
              Load Next Year ↓
            </button>
          </div>
        </div>
      ) : (
        <div className={`${styles.rosterSection} ${styles.absenceSection}`}>
          <div className={styles.rosterTableContainer}>
            <table className={`${styles.rosterTable} ${styles.absenceTable}`}>
              <thead>
                <tr>
                  <th
                    className={`${styles.rosterTableHeaderCell} ${styles.stickyCol} sticky-header`}
                  >
                    <div className={styles.dateHeaderContent}>
                      Date
                      <div className={styles.dateHeaderActions}>
                        <button
                          className={styles.loadPrevBtn}
                          onClick={handleLoadPrevious}
                          title="Load 5 previous dates"
                        >
                          ↑
                        </button>
                        {hasPastDates && (
                          <button
                            className={`${styles.loadPrevBtn} ${styles.resetDatesBtn}`}
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
                      className={`${styles.rosterTableHeaderCell} sticky-header ${
                        user.email && assignedOnClosestDate.includes(user.email)
                          ? styles.highlightedHeader
                          : ""
                      }`}
                    >
                      {user.name}
                    </th>
                  ))}

                  <th className={`${styles.genderDividerCell} sticky-header`} />
                  <th
                    className={`${styles.rosterTableHeaderCell} sticky-header ${styles.stickyRight} ${styles.peekHeader}`}
                  >
                    <select
                      className={styles.peekSelector}
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

                  const trClasses = [
                    rowClass === "past-date" ? styles.pastDate : "",
                    rowClass === "today-date" ? styles.todayDate : "",
                    rowClass === "future-date" ? styles.futureDate : "",
                    !hasData ? styles.noData : "",
                    eventName ? styles.specialEventRow : "",
                    dateString === closestNextDate
                      ? styles.closestNextDateRow
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr key={dateString} className={trClasses}>
                      <td
                        className={`${styles.dateCell} ${styles.stickyCol} ${hasData ? styles.clickable : ""}`}
                        onClick={() => handleDateClick(dateString)}
                        title={eventName}
                      >
                        <div className={styles.dateCellContent}>
                          {eventName && (
                            <span className={styles.specialEventDot} />
                          )}
                          {new Date(
                            dateString.replace(/-/g, "/"),
                          ).toLocaleDateString()}
                          {isToday && (
                            <span
                              className={styles.rosterTodayDot}
                              title="Today"
                            />
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
                            className={`${styles.rosterCell} ${styles.clickable} ${styles.absenceRosterCell} ${
                              isFocused ? styles.focused : ""
                            } ${absent ? styles.absentCell : ""} ${
                              isAssignedOnClosestDate
                                ? styles.highlightedCell
                                : ""
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
                                      handleAbsenceReasonChange(
                                        dateString,
                                        user.email,
                                        e.target.value,
                                      );
                                    }
                                  }}
                                />
                                <button
                                  className={styles.removeAbsenceBtn}
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
                      <td
                        className={`${styles.rosterCell} ${styles.peekCell} ${styles.stickyRight}`}
                      >
                        {getPeekAssignedUsers(dateString).join(", ") || ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={styles.loadMoreFooter}>
            <button
              className={styles.loadNextYearBtn}
              onClick={handleLoadNextYear}
            >
              Load Next Year ↓
            </button>
          </div>
        </div>
      )}

      {hasDirtyChanges && (
        <SaveFooter
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={saving}
          saveText="Save Roster"
        />
      )}
    </div>
  );
};

export default RosterTable;
