import { memo } from "react";

import { useAppDispatch, useAppSelector } from "../../../hooks/redux";
import { Position } from "../../../model/model";
import { setFilterUserId, setHighlightedUserId } from "../../../store/slices/rosterViewSlice";
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
    const dispatch = useAppDispatch();
    const { filterUserId, highlightedUserId } = useAppSelector((state) => state.rosterView);

    const handleHeaderClick = (colId: string) => {
      if (filterUserId === colId) {
        dispatch(setFilterUserId(null));
      } else {
        dispatch(setFilterUserId(colId));
      }
    };

    const handlePositionHeaderClick = (posName: string) => {
      if (filterUserId || highlightedUserId) {
        dispatch(setFilterUserId(null));
        dispatch(setHighlightedUserId(null));
      }
      navigate(`/app/roster/${teamName}/${posName}`);
    };

    return (
      <RosterHeader>
        {rosterAllViewMode === "user"
          ? allViewColumns.map((col) => {
              const isMe = col.id === userData?.email;
              const isFiltered = filterUserId === col.id;
              return (
                <th
                  key={col.id}
                  className={`${styles.rosterTableHeaderCell} ${isMe ? styles.isMe : ""} ${isFiltered ? styles.isFiltered : ""} ${allStyles.clickableHeader}`}
                  onClick={() => handleHeaderClick(col.id)}
                >
                  <NameTag displayName={col.name} isMe={isMe} />
                </th>
              );
            })
          : (currentTeamData?.positions || []).map((pos) => (
              <th
                key={pos.name}
                className={`${styles.rosterTableHeaderCell} ${allStyles.clickableHeader}`}
                onClick={() => handlePositionHeaderClick(pos.name)}
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
