import { useMemo } from "react";

import { Position, Team } from "../model/model";

export const useComputedPositions = (
  selectedTeamNames: string[],
  availableTeams: Team[],
  globalPositions: Position[],
): Position[] => {
  return useMemo(() => {
    if (selectedTeamNames.length === 0) {
      return [];
    }

    const uniquePositionIds = new Set<string>();
    const positionsFromSelectedTeams: Position[] = [];

    selectedTeamNames.forEach((teamName) => {
      const team = availableTeams.find((t) => t.name === teamName);
      if (team) {
        team.positions.forEach((posId) => {
          const pos = globalPositions.find(gp => gp.id === posId || gp.name === posId);
          if (pos && !uniquePositionIds.has(pos.id)) {
            uniquePositionIds.add(pos.id);
            positionsFromSelectedTeams.push(pos);
          }
        });
      }
    });

    return [...positionsFromSelectedTeams];
  }, [selectedTeamNames, availableTeams, globalPositions]);
};
