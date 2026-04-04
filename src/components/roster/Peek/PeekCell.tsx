import { memo } from "react";

import { useParams } from "react-router-dom";

import { useAppSelector } from "../../../hooks/redux";
import { getAssignmentsForTeam } from "../../../model/model";

import styles from "./peek.module.css";

interface PeekCellProps {
  dateString: string;
}

export const PeekCell = memo(({ dateString }: PeekCellProps) => {
  const { teamName } = useParams();
  const { peekPositionName } = useAppSelector((state) => state.ui);
  const allTeamUsers = useAppSelector((state) => state.userManagement.allUsers);
  const { entries } = useAppSelector((state) => state.roster);

  if (!peekPositionName || !teamName)
    return <td className={`${styles.peekCell} peekCell`} />;

  const dateKey = dateString.split("T")[0];
  const entry = entries[dateKey];
  if (!entry || !entry.teams[teamName])
    return <td className={`${styles.peekCell} peekCell`} />;

  const assignments = getAssignmentsForTeam(entry, teamName);
  const assignedUsers = Object.entries(assignments)
    .filter(([, positionIds]) => positionIds.includes(peekPositionName))
    .map(([userKey]) => {
      const user = allTeamUsers.find(
        (u) => u.id === userKey || u.email === userKey,
      );
      return user?.name || userKey;
    });

  return (
    <td className={`${styles.peekCell} ${styles.stickyRight} peekCell`}>
      <div className={styles.peekContent}>
        {assignedUsers.map((name, idx) => (
          <span key={name} className={styles.peekName}>
            {name}
            {idx < assignedUsers.length - 1 ? ", " : ""}
          </span>
        ))}
      </div>
    </td>
  );
});
