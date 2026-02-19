import { memo } from "react";

import { Position } from "../../../model/model";
import NameTag from "../../common/NameTag";
import styles from "../roster-header.module.css";
import RosterHeader from "../RosterHeader";

import allStyles from "./all-roster.module.css";

interface AllRosterHeaderProps {
  rosterAllViewMode: "user" | "position";
  allViewColumns: { id: string; name: string; isUser: boolean }[];
  userData: { email?: string | null } | null;
  currentTeamData: { positions: Position[] } | null;
  teamName?: string;
  navigate: (path: string) => void;
}

export const AllRosterHeader = memo(
  ({
    rosterAllViewMode,
    allViewColumns,
    userData,
    currentTeamData,
    teamName,
    navigate,
  }: AllRosterHeaderProps) => {
    return (
      <RosterHeader>
        {rosterAllViewMode === "user"
          ? allViewColumns.map((col) => {
              const isMe = col.id === userData?.email;
              return (
                <th
                  key={col.id}
                  className={`${styles.rosterTableHeaderCell} ${isMe ? styles.isMe : ""}`}
                >
                  <NameTag displayName={col.name} isMe={isMe} />
                </th>
              );
            })
          : (currentTeamData?.positions || []).map((pos) => (
              <th
                key={pos.name}
                className={`${styles.rosterTableHeaderCell} ${allStyles.clickableHeader}`}
                onClick={() => navigate(`/app/roster/${teamName}/${pos.name}`)}
              >
                <div className={allStyles.allViewPositionHeader}>
                  <span>{pos.emoji}</span>
                  <span className={allStyles.allViewPositionName}>
                    {pos.name}
                  </span>
                </div>
              </th>
            ))}
      </RosterHeader>
    );
  },
);
