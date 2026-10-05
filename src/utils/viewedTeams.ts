import { getAssignmentsForTeam, RosterEntry, Team } from "../model/model";

export interface ViewedTeamAssignment {
  team: Team;
  positionIds: string[];
}

interface ViewedTeamAssignmentsOptions {
  entry?: RosterEntry;
  currentTeamId?: string;
  userIdentifier: string;
  viewedTeamIds?: string[];
  allTeams: Team[];
  activeOrgId?: string | null;
}

export const resolveViewedTeamAssignments = ({
  entry,
  currentTeamId,
  userIdentifier,
  viewedTeamIds = [],
  allTeams,
  activeOrgId,
}: ViewedTeamAssignmentsOptions): ViewedTeamAssignment[] => {
  if (!entry || !activeOrgId || entry.orgId !== activeOrgId) return [];

  const assignments: ViewedTeamAssignment[] = [];
  for (const teamId of new Set(viewedTeamIds)) {
    if (teamId === currentTeamId) continue;
    const team = allTeams.find(
      (candidate) => candidate.id === teamId && candidate.orgId === activeOrgId,
    );
    if (!team) continue;

    const teamAssignments = getAssignmentsForTeam(entry, teamId);
    const positionIds = Array.from(
      new Set(
        Object.entries(teamAssignments)
          .filter(([identifier]) => identifier.trim() === userIdentifier.trim())
          .flatMap(([, positions]) => positions),
      ),
    );
    if (positionIds.length > 0) assignments.push({ team, positionIds });
  }
  return assignments;
};
