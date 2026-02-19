import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "./redux";
import { getTodayKey } from "../model/model";
import {
  updatePositions,
  resetPositionsDirty,
  fetchPositions,
} from "../store/slices/positionsSlice";
import {
  saveRosterChanges,
  resetRosterEdits,
} from "../store/slices/rosterSlice";
import {
  fetchTeamDataForRoster,
  fetchAllTeamUsers,
  fetchUsersByTeamAndPosition,
  loadPreviousDates,
  resetToUpcomingDates,
  loadNextYearDates,
} from "../store/slices/rosterViewSlice";
import { toggleUserVisibility } from "../store/slices/uiSlice";

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
  const { hiddenUsers, rosterAllViewMode } = useAppSelector(
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

  const hasPastDates = useMemo(() => {
    const todayKey = getTodayKey();
    return rosterDates.length > 0 && rosterDates[0] < todayKey;
  }, [rosterDates]);

  const closestNextDate = useMemo(() => {
    const todayKey = getTodayKey();
    return rosterDates.find((d) => d.split("T")[0] >= todayKey);
  }, [rosterDates]);

  const hiddenUserList = useMemo(() => {
    if (!teamName || !activePosition) return [];
    return hiddenUsers[teamName]?.[activePosition] || [];
  }, [hiddenUsers, teamName, activePosition]);

  const getRowClass = useCallback((dateString: string) => {
    const todayKey = getTodayKey();
    const dateKey = dateString.split("T")[0];
    if (dateKey < todayKey) return "past-date";
    if (dateKey === todayKey) return "today-date";
    return "future-date";
  }, []);

  const todayKey = useMemo(() => getTodayKey(), []);

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
    hasPastDates,
    closestNextDate,
    isLoading,
    error,
    checkHasAssignments,
    getRowClass,
    todayKey,
  };
};
