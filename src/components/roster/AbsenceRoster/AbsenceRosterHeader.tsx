import { memo } from "react";

import { AppUser } from "../../../model/model";
import { DividerHeader } from "../Dividers";
import styles from "../roster-header.module.css";
import RosterHeader from "../RosterHeader";

interface AbsenceRosterHeaderProps {
  allTeamUsers: AppUser[];
  showPeek?: boolean;
}

export const AbsenceRosterHeader = memo(
  ({ allTeamUsers, showPeek }: AbsenceRosterHeaderProps) => {
    return (
      <RosterHeader showPeek={showPeek}>
        {allTeamUsers.map((user) => (
          <th key={user.email} className={styles.rosterTableHeaderCell}>
            {user.name}
          </th>
        ))}
        <DividerHeader />
      </RosterHeader>
    );
  },
);
