import { Fragment, memo } from "react";

import { AppUser, Position } from "../../../model/model";
import NameTag from "../../common/NameTag";
import { DividerHeader } from "../Dividers";
import styles from "../roster-header.module.css";
import RosterHeader from "../RosterHeader";

import generalStyles from "./general-roster.module.css";

interface GeneralRosterHeaderProps {
  sortedUsers: AppUser[];
  genderDividerIndex: number;
  assignedOnClosestDate: string[];
  currentPosition?: Position;
  userData: { email?: string | null } | null;
  onToggleVisibility: (email: string) => void;
  showPeek?: boolean;
}

export const GeneralRosterHeader = memo(
  ({
    sortedUsers,
    genderDividerIndex,
    assignedOnClosestDate,
    currentPosition,
    userData,
    onToggleVisibility,
    showPeek,
  }: GeneralRosterHeaderProps) => {
    return (
      <RosterHeader showPeek={showPeek}>
        {sortedUsers.map((user, colIndex) => {
          const isMe = !!(user.email && user.email === userData?.email);
          return (
            <Fragment key={user.email}>
              {genderDividerIndex === colIndex && <DividerHeader />}
              <th
                className={`${styles.rosterTableHeaderCell} ${generalStyles.clickableHeader} ${
                  user.email && assignedOnClosestDate.includes(user.email)
                    ? styles.highlightedHeader
                    : ""
                }`}
                onClick={() => user.email && onToggleVisibility(user.email)}
                title="Click to hide member"
              >
                <NameTag displayName={user.name} isMe={isMe} />
                {currentPosition?.sortByGender && (
                  <span className={generalStyles.genderLabel}>
                    (
                    {user.gender === "Male"
                      ? "M"
                      : user.gender === "Female"
                        ? "F"
                        : "?"}
                    )
                  </span>
                )}
              </th>
            </Fragment>
          );
        })}
        <DividerHeader />
      </RosterHeader>
    );
  },
);
