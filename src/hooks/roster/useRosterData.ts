import { useEffect, useMemo } from "react";

import { useParams } from "react-router-dom";

import { fetchRosterEntries } from "../../store/slices/rosterSlice";
import {
  fetchTeamDataForRoster,
  fetchAllTeamUsers,
  fetchUsersByTeamAndPosition,
} from "../../store/slices/rosterViewSlice";
import { useAppDispatch, useAppSelector } from "../redux";
import { useRosterVisualRows } from "../useRosterVisualRows";

export const useRosterData = () => {
  const dispatch = useAppDispatch();
  const { teamName, positionName: activePosition } = useParams();

  const { userData } = useAppSelector((state) => state.auth);
  const orgId = userData?.orgId;
  
  // Roster View Selectors
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
  
  // Roster Data Selectors
  const {
    entries,
    syncing,
    loading: loadingRoster,
    initialLoad,
    error: rosterError,
  } = useAppSelector((state) => state.roster);
  
  // Metadata Selectors
  const { positions: allPositions, isDirty: positionsDirty } = useAppSelector(
    (state) => state.positions,
  );
  
  const teamsState = useAppSelector((state) => state.teams);
  const allTeams = useMemo(() => teamsState?.teams || [], [teamsState?.teams]);

  const teamId = useMemo(() => 
    allTeams.find(t => t.name === teamName)?.id || teamName, 
  [allTeams, teamName]);

  const activePositionId = useMemo(() => 
    allPositions.find(p => p.name === activePosition)?.id || activePosition, 
  [allPositions, activePosition]);

  const currentTeam = useMemo(() => allTeams.find(t => t.id === teamId), [allTeams, teamId]);
  const isSlotted = currentTeam?.rosterMode === "slotted";
  const visualRows = useRosterVisualRows(rosterDates, currentTeam || null, !!isSlotted);

  // Data Fetching Effects
  useEffect(() => {
    if (teamId && orgId) {
      dispatch(fetchTeamDataForRoster({ teamId, orgId }));
      dispatch(fetchAllTeamUsers({ teamId, orgId }));
      dispatch(fetchRosterEntries(orgId));
    }
  }, [teamId, orgId, dispatch]);

  useEffect(() => {
    if (
      activePositionId &&
      teamId &&
      orgId &&
      !["Absence", "All"].includes(activePositionId)
    ) {
      dispatch(
        fetchUsersByTeamAndPosition({ teamId, positionId: activePositionId, orgId }),
      );
    }
  }, [activePositionId, teamId, orgId, dispatch]);

  const isLoading = 
    loadingUsers || 
    loadingTeam || 
    loadingAllTeamUsers || 
    (loadingRoster && !initialLoad);
    
  const error = viewError || rosterError;

  return {
    teamName,
    activePosition,
    teamId,
    activePositionId,
    userData,
    users,
    allTeamUsers,
    rosterDates,
    currentTeamData,
    entries,
    syncing,
    allPositions,
    allTeams,
    positionsDirty,
    isLoading,
    error,
    dispatch,
    visualRows,
  };
};
