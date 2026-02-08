import { useMemo } from "react";

import { Position, Team } from "../model/model";

export const useComputedPositions = (
  selectedTeamNames: string[],
  availableTeams: Team[],
): Position[] => {
  return useMemo(() => {
    if (selectedTeamNames.length === 0) {
      return [];
    }

    const uniquePositionNames = new Set<string>();
    const positionsFromSelectedTeams: Position[] = [];

    selectedTeamNames.forEach((teamName) => {
      const team = availableTeams.find((t) => t.name === teamName);
      if (team) {
        team.positions.forEach((pos) => {
          if (!uniquePositionNames.has(pos.name)) {
            uniquePositionNames.add(pos.name);
            positionsFromSelectedTeams.push(pos);
          }
        });
      }
    });

    return [...positionsFromSelectedTeams];
  }, [selectedTeamNames, availableTeams]);
};
