import { memo } from "react";

import { AppUser } from "../../../model/model";
import NameTag from "../../common/NameTag";
import { DividerHeader } from "../Dividers";
import styles from "../roster-header.module.css";
import RosterHeader from "../RosterHeader";

interface AbsenceRosterHeaderProps {
  allTeamUsers: AppUser[];
  userData: { email?: string | null; gender?: string | null } | null;
  showPeek?: boolean;
}

export const AbsenceRosterHeader = memo(
  ({ allTeamUsers, userData, showPeek }: AbsenceRosterHeaderProps) => {
    return (
      <RosterHeader showPeek={showPeek}>
        {allTeamUsers.map((user) => {
          const isMe = !!(user.email && user.email === userData?.email);
          return (
            <th key={user.email} className={styles.rosterTableHeaderCell}>
              <NameTag 
                displayName={user.name} 
                isMe={isMe} 
                gender={isMe ? userData?.gender : user.gender} 
              />
            </th>
          );
        })}
        <DividerHeader />
      </RosterHeader>
    );
  },
);
