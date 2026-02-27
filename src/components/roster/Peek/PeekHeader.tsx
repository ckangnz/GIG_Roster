import { memo, useMemo } from "react";

import { useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../../hooks/redux";
import { Position } from "../../../model/model";
import { setPeekPositionName } from "../../../store/slices/uiSlice";

import styles from "./peek.module.css";

export const PeekHeader = memo(() => {
  const dispatch = useAppDispatch();
  const { positionName: activePosition } = useParams();
  const { peekPositionName } = useAppSelector((state) => state.ui);
  const { currentTeamData } = useAppSelector((state) => state.rosterView);
  const { positions: allPositions } = useAppSelector((state) => state.positions);

  const peekOptions = useMemo(() => {
    if (!currentTeamData) return [];
    // Only show positions that are NOT the one currently being viewed
    return (currentTeamData.positions || [])
      .map(id => allPositions.find(p => p.id === id || p.name === id))
      .filter((p): p is Position => !!p && p.id !== activePosition && p.name !== activePosition);
  }, [currentTeamData, activePosition, allPositions]);

  return (
    <th
      className={`${styles.peekHeader} ${peekPositionName ? styles.stickyRight : ""}`}
    >
      <select
        className={styles.peekSelector}
        value={peekPositionName || ""}
        onChange={(e) => dispatch(setPeekPositionName(e.target.value || null))}
      >
        <option value="">Peek Position...</option>
        {peekOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.emoji} {opt.name}
          </option>
        ))}
      </select>
    </th>
  );
});
