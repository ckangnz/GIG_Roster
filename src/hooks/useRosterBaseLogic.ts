import { useRosterActions } from "./roster/useRosterActions";
import { useRosterData } from "./roster/useRosterData";
import { useRosterUI } from "./roster/useRosterUI";

/**
 * useRosterBaseLogic (Facade Hook)
 * 
 * This hook acts as a central coordinator for the roster system. 
 * Refactored (Phase 1) to delegate responsibilities to specialized sub-hooks:
 * - useRosterData: State selectors and fetching
 * - useRosterUI: Interaction states (focus, visibility, navigation)
 * - useRosterActions: Business logic (assignments, absences, saving)
 */
export const useRosterBaseLogic = () => {
  // 1. Data Layer
  const data = useRosterData();
  const {
    teamId,
    activePositionId,
    allPositions,
    allTeams,
    entries,
    allTeamUsers,
    rosterDates,
    positionsDirty,
    visualRows,
  } = data;

  // 2. UI Layer
  const ui = useRosterUI(teamId, activePositionId, rosterDates, entries, visualRows);

  // 3. Actions Layer
  const actions = useRosterActions(
    teamId,
    activePositionId,
    allPositions,
    allTeams,
    entries,
    allTeamUsers,
    data.userData
  );

  // Maintain existing unified API
  return {
    ...data,
    ...ui,
    ...actions,
    hasDirtyChanges: positionsDirty,
    // Specialized action wrapper for peek
    getPeekAssignedUsers: (dateString: string) => 
      actions.getPeekAssignedUsers(dateString, ui.peekPositionName || undefined),
  };
};
