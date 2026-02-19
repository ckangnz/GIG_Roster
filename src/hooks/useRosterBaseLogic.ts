import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "./redux";
import { getTodayKey, Team } from "../model/model";
import {
  updatePositions,
  resetPositionsDirty,
  fetchPositions,
} from "../store/slices/positionsSlice";
import {
  saveRosterChanges,
  resetRosterEdits,
  updateLocalAssignment,
  updateLocalAbsence,
} from "../store/slices/rosterSlice";
import {
  fetchTeamDataForRoster,
  fetchAllTeamUsers,
  fetchUsersByTeamAndPosition,
  loadPreviousDates,
  resetToUpcomingDates,
  loadNextYearDates,
} from "../store/slices/rosterViewSlice";
import { toggleUserVisibility, showAlert } from "../store/slices/uiSlice";

export const useRosterBaseLogic = () => {
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
    saving: isSaving,
    loading: loadingRoster,
    initialLoad,
    error: rosterError,
  } = useAppSelector((state) => state.roster);
  
  const { positions: allPositions, isDirty: positionsDirty } = useAppSelector(
    (state) => state.positions,
  );
  
  const { teams: allTeams } = useAppSelector((state) => state.teams);
  const { hiddenUsers, rosterAllViewMode, peekPositionName } = useAppSelector(
    (state) => state.ui,
  );

  const [focusedCell, setFocusedCell] = useState<{
    row: number;
    col: number;
    table: "roster" | "absence" | "all";
  } | null>(null);

  const hasRosterChanges = Object.keys(dirtyEntries).length > 0;
  const hasDirtyChanges = hasRosterChanges || positionsDirty;

  useEffect(() => {
    if (teamName) {
      dispatch(fetchTeamDataForRoster(teamName));
      dispatch(fetchAllTeamUsers(teamName));
    }
  }, [teamName, dispatch]);

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

  const handleToggleVisibility = useCallback((userEmail: string) => {
    if (!teamName || !activePosition) return;
    dispatch(
      toggleUserVisibility({
        teamName,
        positionName: activePosition,
        userEmail,
      }),
    );
  }, [dispatch, teamName, activePosition]);

  const handleLoadPrevious = useCallback(() => dispatch(loadPreviousDates()), [dispatch]);
  const handleResetDates = useCallback(() => dispatch(resetToUpcomingDates()), [dispatch]);
  const handleLoadNextYear = useCallback(() => dispatch(loadNextYearDates()), [dispatch]);

  const checkHasAssignments = useCallback(
    (dateString: string) => {
      const dateKey = dateString.split("T")[0];
      const entry = dirtyEntries[dateKey] || entries[dateKey];
      if (!entry) return false;
      return Object.values(entry.teams).some((teamAssignments) =>
        Object.values(teamAssignments).some((posList) => posList.length > 0),
      );
    },
    [entries, dirtyEntries],
  );

  const handleDateClick = useCallback((dateString: string) => {
    if (checkHasAssignments(dateString)) {
      navigate(`/app/dashboard?date=${dateString}`);
    }
  }, [checkHasAssignments, navigate]);

  const handleSave = useCallback(() => {
    if (hasRosterChanges) dispatch(saveRosterChanges(dirtyEntries));
    if (positionsDirty) dispatch(updatePositions(allPositions));
  }, [dispatch, dirtyEntries, allPositions, hasRosterChanges, positionsDirty]);

  const handleCancel = useCallback(() => {
    if (hasRosterChanges) dispatch(resetRosterEdits());
    if (positionsDirty) {
      dispatch(resetPositionsDirty());
      dispatch(fetchPositions());
    }
    setFocusedCell(null);
  }, [dispatch, hasRosterChanges, positionsDirty]);

  const isUserAbsent = useCallback(
    (dateString: string, userEmail: string) => {
      const entry = dirtyEntries[dateString] || entries[dateString];
      return !!(entry && entry.absence && entry.absence[userEmail]);
    },
    [dirtyEntries, entries],
  );

  const getAbsenceReason = useCallback(
    (dateString: string, userEmail: string) => {
      const entry = dirtyEntries[dateString] || entries[dateString];
      return entry?.absence?.[userEmail]?.reason || "";
    },
    [dirtyEntries, entries],
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
    [teamName, dirtyEntries, entries, allTeamUsers, peekPositionName],
  );

  const hiddenUserList = useMemo(() => {
    if (!teamName || !activePosition) return [];
    return hiddenUsers[teamName]?.[activePosition] || [];
  }, [hiddenUsers, teamName, activePosition]);

  const isCellDisabled = useCallback(
    (dateString: string, userEmail: string) => {
      if (!teamName || !activePosition || activePosition === "Absence" || activePosition === "All") return false;
      if (isUserAbsent(dateString, userEmail)) return true;

      const entry = dirtyEntries[dateString] || entries[dateString];
      const currentTeam = allTeams.find((t: Team) => t.name === teamName);
      const maxConflict = currentTeam?.maxConflict || 1;

      if (!entry || !entry.teams[teamName] || !entry.teams[teamName][userEmail]) return false;

      const userAssignments = entry.teams[teamName][userEmail];
      const children = allPositions.filter((p) => p.parentId === activePosition);
      const positionGroupNames = [activePosition, ...children.map((c) => c.name)];
      
      if (userAssignments.some((p) => positionGroupNames.includes(p))) return false;
      return userAssignments.length >= maxConflict;
    },
    [teamName, activePosition, isUserAbsent, dirtyEntries, entries, allTeams, allPositions],
  );

  const handleCellClick = useCallback((dateString: string, userEmail: string, row: number, col: number) => {
    if (activePosition === "Absence" || activePosition === "All") return;
    if (isCellDisabled(dateString, userEmail)) {
      setFocusedCell({ row, col, table: "roster" });
      return;
    }
    setFocusedCell({ row, col, table: "roster" });

    const currentTeam = allTeams.find((t: Team) => t.name === teamName);
    const maxConflict = currentTeam?.maxConflict || 1;
    const children = allPositions.filter((p) => p.parentId === activePosition);
    const positionGroupNames: string[] = [activePosition!, ...children.map((c) => c.name)];

    dispatch(updateLocalAssignment({
      date: dateString,
      teamName: teamName!,
      userIdentifier: userEmail,
      positionGroupNames,
      maxConflict,
    }));
  }, [isCellDisabled, allTeams, teamName, activePosition, allPositions, dispatch]);

  const handleAbsenceClick = useCallback((dateString: string, userEmail: string, row: number, col: number) => {
    setFocusedCell({ row, col, table: "absence" });
    const isCurrentlyAbsent = isUserAbsent(dateString, userEmail);

    if (!isCurrentlyAbsent) {
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
            dispatch(updateLocalAbsence({ date: dateString, userIdentifier: userEmail, isAbsent: true }));
          }
        }));
        return;
      }
    }

    dispatch(updateLocalAbsence({ date: dateString, userIdentifier: userEmail, isAbsent: !isCurrentlyAbsent }));
  }, [dispatch, isUserAbsent, dirtyEntries, entries]);

  const getRowClass = useCallback((dateString: string) => {
    const todayKey = getTodayKey();
    const dateKey = dateString.split("T")[0];
    if (dateKey < todayKey) return "past-date";
    if (dateKey === todayKey) return "today-date";
    return "future-date";
  }, []);

  const todayKey = useMemo(() => getTodayKey(), []);

  const hasPastDates = useMemo(() => {
    const today = getTodayKey();
    return rosterDates.length > 0 && rosterDates[0] < today;
  }, [rosterDates]);

  const closestNextDate = useMemo(() => {
    const today = getTodayKey();
    return rosterDates.find((d) => d.split("T")[0] >= today);
  }, [rosterDates]);

  // Boundaries for Keyboard Nav
  const getColCount = useCallback(() => {
    if (activePosition === "Absence") return allTeamUsers.length;
    if (activePosition === "All") {
      if (rosterAllViewMode === "user") return allTeamUsers.length;
      return currentTeamData?.positions.length || 0;
    }
    const currentPos = allPositions.find(p => p.name === activePosition);
    if (currentPos?.isCustom) return currentPos.customLabels?.length || 0;
    const sorted = users.filter(u => u.email && !hiddenUserList.includes(u.email) && u.isActive);
    return sorted.length;
  }, [activePosition, allTeamUsers.length, rosterAllViewMode, currentTeamData?.positions.length, allPositions, users, hiddenUserList]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (!focusedCell) return;

      const { row, col, table } = focusedCell;
      const rowCount = rosterDates.length;
      const colCount = getColCount();

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          if (row > 0) setFocusedCell({ row: row - 1, col, table });
          break;
        case "ArrowDown":
          e.preventDefault();
          if (row < rowCount - 1) setFocusedCell({ row: row + 1, col, table });
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (col > 0) setFocusedCell({ row, col: col - 1, table });
          break;
        case "ArrowRight":
          e.preventDefault();
          if (col < colCount - 1) setFocusedCell({ row, col: col + 1, table });
          break;
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            if (row > 0) setFocusedCell({ row: row - 1, col, table });
          } else {
            if (row < rowCount - 1) setFocusedCell({ row: row + 1, col, table });
          }
          break;
        case " ": {
          e.preventDefault();
          if (table === "all") break;
          const dStr = rosterDates[row];
          if (table === "roster") {
            const currentPos = allPositions.find(p => p.name === activePosition);
            if (currentPos?.isCustom) {
              const label = currentPos.customLabels?.[col];
              if (label) handleCellClick(dStr, label, row, col);
            } else {
              const sorted = users.filter(u => u.email && !hiddenUserList.includes(u.email) && u.isActive);
              const usr = sorted[col];
              if (usr?.email) handleCellClick(dStr, usr.email, row, col);
            }
          } else {
            const usr = allTeamUsers[col];
            if (usr?.email) handleAbsenceClick(dStr, usr.email, row, col);
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
  }, [focusedCell, rosterDates, users, allTeamUsers, hasDirtyChanges, handleCellClick, handleAbsenceClick, handleSave, handleCancel, getColCount, allPositions, activePosition, hiddenUserList]);

  const isLoading = loadingUsers || loadingTeam || loadingAllTeamUsers || (loadingRoster && !initialLoad);
  const error = viewError || rosterError;

  return {
    dispatch,
    navigate,
    teamName,
    activePosition,
    userData,
    users,
    allTeamUsers,
    rosterDates,
    currentTeamData,
    entries,
    dirtyEntries,
    isSaving,
    allPositions,
    allTeams,
    hiddenUsers,
    hiddenUserList,
    rosterAllViewMode,
    focusedCell,
    setFocusedCell,
    hasDirtyChanges,
    handleToggleVisibility,
    handleLoadPrevious,
    handleResetDates,
    handleLoadNextYear,
    handleDateClick,
    handleSave,
    handleCancel,
    isUserAbsent,
    getAbsenceReason,
    getPeekAssignedUsers,
    isLoading,
    error,
    checkHasAssignments,
    getRowClass,
    todayKey,
    handleCellClick,
    handleAbsenceClick,
    isCellDisabled,
    hasPastDates,
    closestNextDate,
  };
};
