import { useEffect, useMemo } from "react";

import { useParams } from "react-router-dom";

import { OrgMembership } from "../../model/model";
import { selectUserData } from "../../store/slices/authSlice";
import { fetchRosterEntries } from "../../store/slices/rosterSlice";
import {
  fetchTeamDataForRoster,
} from "../../store/slices/rosterViewSlice";
import { useAppDispatch, useAppSelector } from "../redux";
import { useRosterVisualRows } from "../useRosterVisualRows";


export const useRosterData = () => {
  const dispatch = useAppDispatch();
  const { teamName, positionName: activePosition } = useParams();

  const userData = useAppSelector(selectUserData);
  const activeOrgId = userData?.activeOrgId;
  const orgId = activeOrgId;
  
  // Metadata Selectors
  const { positions: allPositions, isDirty: positionsDirty } = useAppSelector(
    (state) => state.positions,
  );
  
  const teamsState = useAppSelector((state) => state.teams);
  const allTeams = useMemo(() => teamsState?.teams || [], [teamsState?.teams]);

  const teamId = useMemo(() => 
    allTeams.find(t => t.id === teamName || t.name === teamName)?.id || teamName, 
  [allTeams, teamName]);

  const activePositionId = useMemo(() => 
    allPositions.find(p => p.id === activePosition || p.name === activePosition)?.id || activePosition, 
  [allPositions, activePosition]);

  // Use globally synced users from userManagement slice for reliability
  const { allUsers: globallySyncedUsers, loading: loadingGlobalUsers } = useAppSelector((state) => state.userManagement);
  
  const allTeamUsers = useMemo(() => {
    if (!teamId) return [];
    return globallySyncedUsers.filter(u => {
      const orgs = u.organisations as Record<string, OrgMembership>;
      const orgEntry = activeOrgId ? orgs?.[activeOrgId] : null;
      return orgEntry?.teams?.includes(teamId);
    });
  }, [globallySyncedUsers, teamId, activeOrgId]);

  const users = useMemo(() => {
    if (!teamId || !activePositionId || ["Absence", "All"].includes(activePositionId)) {
      return allTeamUsers;
    }
    
    // Find children of this position
    const children = allPositions.filter((p) => p.parentId === activePositionId);
    const positionGroup = [activePositionId, ...children.map((c) => c.id)];
    const indexedKeys = positionGroup.map((posId) => `${teamId}|${posId}`);

    return allTeamUsers.filter(u => {
      const orgs = u.organisations as Record<string, OrgMembership>;
      const orgEntry = activeOrgId ? orgs?.[activeOrgId] : null;
      return orgEntry?.indexedAssignments?.some((ia: string) => indexedKeys.includes(ia));
    });
  }, [allTeamUsers, teamId, activePositionId, allPositions, activeOrgId]);

  // Roster View Selectors
  const {
    rosterDates,
    currentTeamData,
    loadingTeam,
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
  
  const currentTeam = useMemo(() => allTeams.find(t => t.id === teamId), [allTeams, teamId]);
  const isSlotted = currentTeam?.rosterMode === "slotted";
  const visualRows = useRosterVisualRows(rosterDates, currentTeam || null, !!isSlotted);

  // Data Fetching Effects
  useEffect(() => {
    if (teamId && orgId) {
      dispatch(fetchTeamDataForRoster({ teamId, orgId }));
      dispatch(fetchRosterEntries(orgId));
    }
  }, [teamId, orgId, dispatch]);

  const isLoading = 
    loadingGlobalUsers || 
    loadingTeam || 
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
