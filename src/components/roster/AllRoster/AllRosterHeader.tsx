import { memo, useMemo } from "react";

import { useAppDispatch, useAppSelector } from "../../../hooks/redux";
import { Position } from "../../../model/model";
import { setFilterUserId, setHighlightedUserId } from "../../../store/slices/rosterViewSlice";
import NameTag from "../../common/NameTag";
import styles from "../roster-header.module.css";
import RosterHeader from "../RosterHeader";

import allStyles from "./all-roster.module.css";

interface AllRosterHeaderProps {
  rosterAllViewMode: "user" | "position";
  allViewColumns: { id: string; name: string; isUser: boolean; gender?: string | null }[];
  userData: { email?: string | null; gender?: string | null } | null;
  currentTeamData: { positions: string[] } | null;
  allPositions: Position[];
  teamName?: string;
  navigate: (path: string) => void;
}

export const AllRosterHeader = memo(
  ({
    rosterAllViewMode,
    allViewColumns,
    userData,
    currentTeamData,
    allPositions,
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

    const allViewPositions = useMemo(() => {
      if (rosterAllViewMode !== "position" || !currentTeamData) return [];
      
      const teamPositionIds = currentTeamData.positions || [];
      const activePosIdSet = new Set<string>(teamPositionIds);

      // Also ensure children of these positions are included
      teamPositionIds.forEach(pId => {
        allPositions.forEach(p => {
          if (p.parentId === pId) activePosIdSet.add(p.id);
        });
      });

      return Array.from(activePosIdSet).sort((aId, bId) => {
        const posA = allPositions.find(p => p.id === aId || p.name === aId);
        const posB = allPositions.find(p => p.id === bId || p.name === bId);
        
        const effectiveParentA = posA?.parentId || aId;
        const effectiveParentB = posB?.parentId || bId;

        if (effectiveParentA === effectiveParentB) {
          if (!posA?.parentId) return -1;
          if (!posB?.parentId) return 1;
          return (posA.name || "").localeCompare(posB.name || "");
        }

        const indexA = teamPositionIds.indexOf(effectiveParentA);
        const indexB = teamPositionIds.indexOf(effectiveParentB);
        
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return (posA?.name || "").localeCompare(posB?.name || "");
      });
    }, [rosterAllViewMode, currentTeamData, allPositions]);

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
                  <NameTag
                    displayName={col.name}
                    isMe={isMe}
                    isHighlighted={isFiltered}
                    gender={isMe ? userData?.gender : col.gender}
                  />
                </th>
              );
            })
          : allViewPositions.map((posId) => {
              const pos = allPositions.find(p => p.id === posId || p.name === posId);
              return (
                <th
                  key={posId}
                  className={`${styles.rosterTableHeaderCell} ${allStyles.clickableHeader}`}
                  onClick={() => handlePositionHeaderClick(pos?.id || posId)}
                >
                  <div className={allStyles.allViewPositionHeader}>
                    <span>{pos?.emoji || '❓'}</span>
                    <span className={allStyles.allViewPositionName}>
                      {pos?.name || posId}
                    </span>
                  </div>
                </th>
              );
            })}
      </RosterHeader>
    );
  },
);
