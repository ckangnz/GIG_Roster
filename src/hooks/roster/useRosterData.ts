import { useEffect, useMemo } from "react";

import { useParams } from "react-router-dom";

import {
  fetchTeamDataForRoster,
  fetchAllTeamUsers,
  fetchUsersByTeamAndPosition,
} from "../../store/slices/rosterViewSlice";
import { useAppDispatch, useAppSelector } from "../redux";

export const useRosterData = () => {
  const dispatch = useAppDispatch();
  const { teamName, positionName: activePosition } = useParams();

  const { userData } = useAppSelector((state) => state.auth);
  
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

  // Data Fetching Effects
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
  };
};
