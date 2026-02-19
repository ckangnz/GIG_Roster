import { memo, useMemo } from "react";

import { useParams } from "react-router-dom";

import { useAppSelector } from "../../../hooks/redux";

import styles from "./peek.module.css";

interface PeekCellProps {
  dateString: string;
}

export const PeekCell = memo(({ dateString }: PeekCellProps) => {
  const { teamName } = useParams();
  const { peekPositionName } = useAppSelector((state) => state.ui);
  const { entries, dirtyEntries } = useAppSelector((state) => state.roster);
  const { allTeamUsers } = useAppSelector((state) => state.rosterView);

  const assignedUserNames = useMemo(() => {
    if (!peekPositionName || !teamName) return [];
    
    const dateKey = dateString.split("T")[0];
    const entry = dirtyEntries[dateKey] || entries[dateKey];
    if (!entry || !entry.teams[teamName]) return [];

    return Object.entries(entry.teams[teamName])
      .filter(([, assignments]) => assignments.includes(peekPositionName))
      .map(([email]) => {
        const user = allTeamUsers.find((u) => u.email === email);
        return user?.name || email;
      });
  }, [peekPositionName, teamName, dateString, dirtyEntries, entries, allTeamUsers]);

  if (assignedUserNames.length === 0) {
    return <td className={`${styles.peekCell} ${styles.stickyRight}`} />;
  }

  return (
    <td className={`${styles.peekCell} ${styles.stickyRight}`}>
      {assignedUserNames.join(", ")}
    </td>
  );
});
