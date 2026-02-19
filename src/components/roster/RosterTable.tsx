import { useCallback, useEffect, useMemo, useState, Fragment } from "react";

import { useNavigate, useParams } from "react-router-dom";

import RosterHeader from "./RosterHeader";
import RosterRow from "./RosterRow";
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
import { toggleUserVisibility, showAlert } from "../../store/slices/uiSlice";
import NameTag from "../common/NameTag";
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
    loading: loadingRoster,
    initialLoad,
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

      if (!isCurrentlyAbsent) {
        // Check for existing assignments before marking absent
        const dateKey = dateString;
        const entry = dirtyEntries[dateKey] || entries[dateKey];
        const affectedAssignments: string[] = [];

        if (entry) {
          Object.entries(entry.teams).forEach(([tName, teamAssignments]) => {
            if (teamAssignments[userEmail] && teamAssignments[userEmail].length > 0) {
              affectedAssignments.push(`${tName}: ${teamAssignments[userEmail].join(", ")}`);
            }
          });
        }

        if (affectedAssignments.length > 0) {
          dispatch(showAlert({
            title: "Clear Existing Assignments?",
            message: `User is already assigned to:\n\n${affectedAssignments.join("\n")}\n\nMarking them as absent will remove these assignments. Continue?`,
            confirmText: "Mark Absent",
            onConfirm: () => {
              dispatch(
                updateLocalAbsence({
                  date: dateString,
                  userIdentifier: userEmail,
                  isAbsent: true,
                }),
              );
            }
          }));
          return;
        }
      }

      dispatch(
        updateLocalAbsence({
          date: dateString,
          userIdentifier: userEmail,
          isAbsent: !isCurrentlyAbsent,
        }),
      );
    },
    [dispatch, isUserAbsent, dirtyEntries, entries],
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
    dispatch(showAlert({
      title: "Remove Column",
      message: "Are you sure you want to remove this column?",
      confirmText: "Remove",
      onConfirm: () => {
        const currentLabels = [...(currentPosition.customLabels || [])];
        currentLabels.splice(index, 1);
        dispatch(
          updatePositionCustomLabels({
            positionName: activePosition,
            labels: currentLabels,
          }),
        );
      }
    }));
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
              <NameTag displayName={displayName} isMe={isMe} />
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

  if (
    loadingUsers ||
    loadingTeam ||
    loadingAllTeamUsers ||
    (loadingRoster && !initialLoad)
  ) {
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
              <RosterHeader
                viewType="all"
                rosterAllViewMode={rosterAllViewMode}
                allViewColumns={allViewColumns}
                userData={userData}
                assignedOnClosestDate={assignedOnClosestDate}
                currentTeamData={currentTeamData}
                teamName={teamName}
                navigate={navigate}
                hasPastDates={hasPastDates}
                onLoadPrevious={handleLoadPrevious}
                onResetDates={handleResetDates}
                peekPositionName={peekPositionName}
                setPeekPositionName={setPeekPositionName}
                peekOptions={peekOptions}
                // Dummy values for required props not used in "all" view
                sortedUsers={[]}
                genderDividerIndex={-1}
                onToggleVisibility={() => {}}
                handleUpdateCustomLabel={() => {}}
                handleMoveCustomLabel={() => {}}
                handleRemoveCustomLabel={() => {}}
                handleAddCustomLabel={() => {}}
                allTeamUsers={[]}
              />
              <tbody>
                {rosterDates.map((dateString, rowIndex) => (
                  <RosterRow
                    key={dateString}
                    viewType="all"
                    dateString={dateString}
                    rowIndex={rowIndex}
                    rowClass={getRowClass(dateString)}
                    isToday={getRowClass(dateString) === "today-date"}
                    hasData={checkHasAssignments(dateString)}
                    eventName={
                      (
                        dirtyEntries[dateString.split("T")[0]] ||
                        entries[dateString.split("T")[0]]
                      )?.eventName
                    }
                    closestNextDate={closestNextDate}
                    onDateClick={handleDateClick}
                    focusedCell={focusedCell}
                    setFocusedCell={setFocusedCell}
                    rosterAllViewMode={rosterAllViewMode}
                    allViewColumns={allViewColumns}
                    assignedOnClosestDate={assignedOnClosestDate}
                    currentTeamData={currentTeamData}
                    getAllViewUserCellContent={getAllViewUserCellContent}
                    getAllViewPositionCellContent={
                      getAllViewPositionCellContent
                    }
                    getAssignmentsForIdentifier={getAssignmentsForIdentifier}
                    navigate={navigate}
                    teamName={teamName}
                    // Dummy values for required props not used in "all" view
                    sortedUsers={[]}
                    genderDividerIndex={-1}
                    isCellDisabled={() => false}
                    isUserAbsent={isUserAbsent}
                    getAbsenceReason={getAbsenceReason}
                    getPeekAssignedUsers={() => []}
                    handleCellClick={() => {}}
                    getCellContent={() => null}
                    allTeamUsers={[]}
                    handleAbsenceClick={() => {}}
                    handleAbsenceReasonChange={() => {}}
                  />
                ))}
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
              <RosterHeader
                viewType="roster"
                userData={userData}
                assignedOnClosestDate={assignedOnClosestDate}
                currentTeamData={currentTeamData}
                teamName={teamName}
                navigate={navigate}
                hasPastDates={hasPastDates}
                onLoadPrevious={handleLoadPrevious}
                onResetDates={handleResetDates}
                currentPosition={currentPosition}
                handleUpdateCustomLabel={handleUpdateCustomLabel}
                handleMoveCustomLabel={handleMoveCustomLabel}
                handleRemoveCustomLabel={handleRemoveCustomLabel}
                handleAddCustomLabel={handleAddCustomLabel}
                sortedUsers={sortedUsers}
                genderDividerIndex={genderDividerIndex}
                onToggleVisibility={handleToggleVisibility}
                peekPositionName={peekPositionName}
                setPeekPositionName={setPeekPositionName}
                peekOptions={peekOptions}
                allViewColumns={[]}
                allTeamUsers={[]}
              />
              <tbody>
                {rosterDates.map((dateString, rowIndex) => (
                  <RosterRow
                    key={dateString}
                    viewType="roster"
                    dateString={dateString}
                    rowIndex={rowIndex}
                    rowClass={getRowClass(dateString)}
                    isToday={getRowClass(dateString) === "today-date"}
                    hasData={checkHasAssignments(dateString)}
                    eventName={
                      (
                        dirtyEntries[dateString.split("T")[0]] ||
                        entries[dateString.split("T")[0]]
                      )?.eventName
                    }
                    closestNextDate={closestNextDate}
                    onDateClick={handleDateClick}
                    focusedCell={focusedCell}
                    setFocusedCell={setFocusedCell}
                    currentPosition={currentPosition}
                    handleCellClick={handleCellClick}
                    getCellContent={getCellContent}
                    sortedUsers={sortedUsers}
                    genderDividerIndex={genderDividerIndex}
                    isCellDisabled={isCellDisabled}
                    isUserAbsent={isUserAbsent}
                    getAbsenceReason={getAbsenceReason}
                    getPeekAssignedUsers={getPeekAssignedUsers}
                    // Dummy values for required props not used in "roster" view
                    allViewColumns={[]}
                    assignedOnClosestDate={assignedOnClosestDate}
                    currentTeamData={currentTeamData}
                    getAllViewUserCellContent={() => null}
                    getAllViewPositionCellContent={() => null}
                    getAssignmentsForIdentifier={() => []}
                    navigate={navigate}
                    teamName={teamName}
                    allTeamUsers={[]}
                    handleAbsenceClick={() => {}}
                    handleAbsenceReasonChange={() => {}}
                  />
                ))}
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
        <div className={styles.rosterSection}>
          <div className={styles.rosterTableContainer}>
            <table className={`${styles.rosterTable} ${styles.absenceTable}`}>
              <RosterHeader
                viewType="absence"
                allTeamUsers={allTeamUsers}
                userData={userData}
                assignedOnClosestDate={assignedOnClosestDate}
                currentTeamData={currentTeamData}
                teamName={teamName}
                navigate={navigate}
                hasPastDates={hasPastDates}
                onLoadPrevious={handleLoadPrevious}
                onResetDates={handleResetDates}
                peekPositionName={peekPositionName}
                setPeekPositionName={setPeekPositionName}
                peekOptions={peekOptions}
                // Dummy values for required props not used in "absence" view
                allViewColumns={[]}
                sortedUsers={[]}
                genderDividerIndex={-1}
                onToggleVisibility={() => {}}
                handleUpdateCustomLabel={() => {}}
                handleMoveCustomLabel={() => {}}
                handleRemoveCustomLabel={() => {}}
                handleAddCustomLabel={() => {}}
              />
              <tbody>
                {rosterDates.map((dateString, rowIndex) => (
                  <RosterRow
                    key={dateString}
                    viewType="absence"
                    dateString={dateString}
                    rowIndex={rowIndex}
                    rowClass={getRowClass(dateString)}
                    isToday={getRowClass(dateString) === "today-date"}
                    hasData={checkHasAssignments(dateString)}
                    eventName={
                      (
                        dirtyEntries[dateString.split("T")[0]] ||
                        entries[dateString.split("T")[0]]
                      )?.eventName
                    }
                    closestNextDate={closestNextDate}
                    onDateClick={handleDateClick}
                    focusedCell={focusedCell}
                    setFocusedCell={setFocusedCell}
                    allTeamUsers={allTeamUsers}
                    handleAbsenceClick={handleAbsenceClick}
                    handleAbsenceReasonChange={handleAbsenceReasonChange}
                    isUserAbsent={isUserAbsent}
                    getAbsenceReason={getAbsenceReason}
                    getPeekAssignedUsers={getPeekAssignedUsers}
                    // Dummy values for required props not used in "absence" view
                    allViewColumns={[]}
                    assignedOnClosestDate={assignedOnClosestDate}
                    currentTeamData={currentTeamData}
                    getAllViewUserCellContent={() => null}
                    getAllViewPositionCellContent={() => null}
                    getAssignmentsForIdentifier={() => []}
                    navigate={navigate}
                    teamName={teamName}
                    sortedUsers={[]}
                    genderDividerIndex={-1}
                    handleCellClick={() => {}}
                    getCellContent={() => null}
                    isCellDisabled={() => false}
                  />
                ))}
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
