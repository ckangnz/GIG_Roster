import { Position } from "../../model/model";
import { ViewedTeamAssignment } from "../../utils/viewedTeams";

import styles from "./roster-cell.module.css";

interface ViewedTeamAssignmentsProps {
  assignments: ViewedTeamAssignment[];
  positions: Position[];
}

const ViewedTeamAssignments = ({
  assignments,
  positions,
}: ViewedTeamAssignmentsProps) => {
  if (assignments.length === 0) return null;

  return (
    <div
      className={styles.viewedTeamsAssignments}
      onClick={(event) => event.stopPropagation()}
    >
      {assignments.flatMap(({ team, positionIds }) =>
        positionIds.map((positionId) => {
          const position = positions.find(
            (candidate) =>
              candidate.orgId === team.orgId &&
              (candidate.id === positionId || candidate.name === positionId),
          );
          const label = `${team.name}: ${position?.name || positionId}`;

          return (
            <span
              key={`${team.id}-${positionId}`}
              className={styles.otherTeamEmoji}
              title={label}
              aria-label={label}
            >
              {position?.emoji || "❓"}
            </span>
          );
        }),
      )}
    </div>
  );
};

export default ViewedTeamAssignments;
