import { useCallback, useEffect, useMemo, useState, useRef } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "./redux";
import { getTodayKey } from "../model/model";
import {
  updatePositions,
  resetPositionsDirty,
  fetchPositions,
} from "../store/slices/positionsSlice";
import {
  applyOptimisticAssignment,
  applyOptimisticAbsence,
  applyOptimisticEventName,
  syncAssignmentRemote,
  syncAbsenceRemote,
  syncEventNameRemote,
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
    syncing,
    loading: loadingRoster,
    initialLoad,
    error: rosterError,
  } = useAppSelector((state) => state.roster);
  
  const { positions: allPositions, isDirty: positionsDirty } = useAppSelector(
    (state) => state.positions,
  );
  
  const teamsState = useAppSelector((state) => state.teams);
  const allTeams = useMemo(() => teamsState?.teams || [], [teamsState?.teams]);
  
  const { hiddenUsers, rosterAllViewMode, peekPositionName } = useAppSelector(
    (state) => state.ui,
  );

  const [focusedCell, setFocusedCell] = useState<{
    row: number;
    col: number;
    table: "roster" | "absence" | "all";
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const hasDirtyChanges = positionsDirty;

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

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocusedCell(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

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
      const entry = entries[dateKey];
      if (!entry) return false;
      return Object.values(entry.teams).some((teamAssignments) =>
        Object.values(teamAssignments).some((posList) => Array.isArray(posList) && posList.length > 0),
      );
    },
    [entries],
  );

  const handleDateClick = useCallback((dateString: string) => {
    if (checkHasAssignments(dateString)) {
      navigate(`/app/dashboard?date=${dateString}`);
    }
  }, [checkHasAssignments, navigate]);

  const handleSave = useCallback(() => {
    if (positionsDirty) dispatch(updatePositions(allPositions));
  }, [dispatch, allPositions, positionsDirty]);

  const handleCancel = useCallback(() => {
    if (positionsDirty) {
      dispatch(resetPositionsDirty());
      dispatch(fetchPositions());
    }
    setFocusedCell(null);
  }, [dispatch, positionsDirty]);

  const isUserAbsent = useCallback(
    (dateString: string, userEmail: string) => {
      const entry = entries[dateString];
      return !!(entry && entry.absence && entry.absence[userEmail]);
    },
    [entries],
  );

  const getAbsenceReason = useCallback(
    (dateString: string, userEmail: string) => {
      const entry = entries[dateString];
      return entry?.absence?.[userEmail]?.reason || "";
    },
    [entries],
  );

  const getPeekAssignedUsers = useCallback(
    (dateString: string) => {
      if (!peekPositionName || !teamName) return [];
      const dateKey = dateString.split("T")[0];
      const entry = entries[dateKey];
      if (!entry || !entry.teams[teamName]) return [];

      return Object.entries(entry.teams[teamName])
        .filter(([, assignments]) => Array.isArray(assignments) && assignments.includes(peekPositionName))
        .map(([email]) => {
          const user = allTeamUsers.find((u) => u.email === email);
          return user?.name || email;
        });
    },
    [teamName, entries, allTeamUsers, peekPositionName],
  );

  const hiddenUserList = useMemo(() => {
    if (!teamName || !activePosition) return [];
    return hiddenUsers[teamName]?.[activePosition] || [];
  }, [hiddenUsers, teamName, activePosition]);

  const isCellDisabled = useCallback(
    (dateString: string, userEmail: string) => {
      if (!teamName || !activePosition || activePosition === "Absence" || activePosition === "All") return false;
      if (isUserAbsent(dateString, userEmail)) return true;

      const entry = entries[dateString];
      const currentTeam = allTeams.find((t) => t.name === teamName);
      const maxConflict = currentTeam?.maxConflict || 1;

      if (!entry || !entry.teams[teamName] || !entry.teams[teamName][userEmail]) return false;

      const userAssignments = entry.teams[teamName][userEmail];
      if (!Array.isArray(userAssignments)) return false;

      const children = allPositions.filter((p) => p.parentId === activePosition);
      const positionGroupNames = [activePosition, ...children.map((c) => c.name)];
      
      if (userAssignments.some((p) => positionGroupNames.includes(p))) return false;
      return userAssignments.length >= maxConflict;
    },
    [teamName, activePosition, isUserAbsent, entries, allTeams, allPositions],
  );

  const handleCellClick = useCallback((dateString: string, userEmail: string, row: number, col: number) => {
    if (activePosition === "Absence" || activePosition === "All" || !teamName || !activePosition) return;
    if (isCellDisabled(dateString, userEmail)) {
      setFocusedCell({ row, col, table: "roster" });
      return;
    }
    setFocusedCell({ row, col, table: "roster" });

    // Cycle calculation logic
    const entry = entries[dateString];
    const userAssignments = entry?.teams[teamName]?.[userEmail] || [];
    const children = allPositions.filter((p) => p.parentId === activePosition);
    const positionGroupNames: string[] = [activePosition, ...children.map((c) => c.name)];
    
    const currentInGroupIndex = positionGroupNames.findIndex((p) => userAssignments.includes(p));
    const currentInGroupName = currentInGroupIndex >= 0 ? positionGroupNames[currentInGroupIndex] : null;

    let nextPositionName: string | null = null;
    if (currentInGroupName === null) {
      nextPositionName = positionGroupNames[0];
    } else if (currentInGroupIndex < positionGroupNames.length - 1) {
      nextPositionName = positionGroupNames[currentInGroupIndex + 1];
    } else {
      nextPositionName = null;
    }

    const updatedAssignments = userAssignments.filter((p) => !positionGroupNames.includes(p));
    if (nextPositionName) {
      updatedAssignments.push(nextPositionName);
    }

    const payload = {
      date: dateString,
      teamName,
      userIdentifier: userEmail,
      updatedAssignments,
    };

    dispatch(applyOptimisticAssignment(payload));
    dispatch(syncAssignmentRemote(payload));
  }, [activePosition, teamName, isCellDisabled, entries, allPositions, dispatch]);

  const handleAbsenceClick = useCallback((dateString: string, userEmail: string, row: number, col: number) => {
    setFocusedCell({ row, col, table: "absence" });
    const isCurrentlyAbsent = isUserAbsent(dateString, userEmail);
    const targetAbsence = !isCurrentlyAbsent;

    const entry = entries[dateString];
    const clearedTeams: string[] = [];
    if (targetAbsence && entry) {
      Object.entries(entry.teams).forEach(([tName, teamAssignments]) => {
        if (Array.isArray(teamAssignments[userEmail]) && teamAssignments[userEmail].length > 0) {
          clearedTeams.push(tName);
        }
      });
    }

    const payload = { 
      date: dateString, 
      userIdentifier: userEmail, 
      isAbsent: targetAbsence,
      clearedTeams
    };

    if (targetAbsence && clearedTeams.length > 0) {
      const teamList = clearedTeams.join(", ");
      dispatch(showAlert({
        title: "Clear Existing Assignments?",
        message: `User is already assigned to: ${teamList}. Marking them as absent will remove these assignments. Continue?`,
        confirmText: "Mark Absent",
        onConfirm: () => {
          dispatch(applyOptimisticAbsence({ date: dateString, userIdentifier: userEmail, isAbsent: true }));
          dispatch(syncAbsenceRemote(payload));
        }
      }));
      return;
    }

    dispatch(applyOptimisticAbsence({ date: dateString, userIdentifier: userEmail, isAbsent: targetAbsence }));
    dispatch(syncAbsenceRemote(payload));
  }, [isUserAbsent, entries, dispatch]);

  const handleAbsenceReasonChange = useCallback((dateString: string, userEmail: string, reason: string) => {
    const payload = { date: dateString, userIdentifier: userEmail, reason, isAbsent: true, clearedTeams: [] };
    dispatch(applyOptimisticAbsence(payload));
    dispatch(syncAbsenceRemote(payload));
  }, [dispatch]);

  const handleEventNameChange = useCallback((dateString: string, eventName: string) => {
    const payload = { date: dateString, eventName };
    dispatch(applyOptimisticEventName(payload));
    dispatch(syncEventNameRemote(payload));
  }, [dispatch]);

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
    syncing,
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
    hasPastDates,
    closestNextDate,
    containerRef,
    handleCellClick,
    handleAbsenceClick,
    handleAbsenceReasonChange,
    handleEventNameChange,
    isCellDisabled,
  };
};
