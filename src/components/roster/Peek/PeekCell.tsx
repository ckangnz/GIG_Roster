import { memo } from "react";

import { useParams } from "react-router-dom";

import { useAppSelector } from "../../../hooks/redux";

import styles from "./peek.module.css";

interface PeekCellProps {
  dateString: string;
}

export const PeekCell = memo(({ dateString }: PeekCellProps) => {
  const { teamName } = useParams();
  const { peekPositionName } = useAppSelector((state) => state.ui);
  const { allTeamUsers } = useAppSelector((state) => state.rosterView);
  const { entries } = useAppSelector((state) => state.roster);

  if (!peekPositionName || !teamName) return <td className={styles.peekCell} />;

  const dateKey = dateString.split("T")[0];
  const entry = entries[dateKey];
  if (!entry || !entry.teams[teamName])
    return <td className={styles.peekCell} />;

  const assignedUsers = Object.entries(entry.teams[teamName])
    .filter(
      ([, assignments]) =>
        Array.isArray(assignments) && assignments.includes(peekPositionName),
    )
    .map(([email]) => {
      const user = allTeamUsers.find((u) => u.email === email);
      return user?.name || email;
    });

  return (
    <td className={`${styles.peekCell} ${styles.stickyRight}`}>
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
