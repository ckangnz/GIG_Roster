import { memo, useMemo } from "react";

import { useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../../hooks/redux";
import { setPeekPositionName } from "../../../store/slices/uiSlice";

import styles from "./peek.module.css";

export const PeekHeader = memo(() => {
  const dispatch = useAppDispatch();
  const { positionName: activePosition } = useParams();
  const { peekPositionName } = useAppSelector((state) => state.ui);
  const { currentTeamData } = useAppSelector((state) => state.rosterView);

  const peekOptions = useMemo(() => {
    if (!currentTeamData) return [];
    // Only show positions that are NOT the one currently being viewed
    return currentTeamData.positions.filter((p) => p.name !== activePosition);
  }, [currentTeamData, activePosition]);

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
          <option key={opt.name} value={opt.name}>
            {opt.emoji} {opt.name}
          </option>
        ))}
      </select>
    </th>
  );
});
