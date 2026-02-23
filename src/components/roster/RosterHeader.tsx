import { ReactNode, memo, useMemo } from "react";

import { History } from "lucide-react";

import { PeekHeader } from "./Peek/PeekHeader";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { getTodayKey } from "../../model/model";
import {
  loadPreviousDates,
} from "../../store/slices/rosterViewSlice";

import styles from "./roster-header.module.css";

interface RosterHeaderProps {
  showPeek?: boolean;
  children: ReactNode;
}

export const useRosterHeaderLogic = () => {
  const { rosterDates } = useAppSelector((state) => state.rosterView);
  const hasPastDates = useMemo(() => {
    const todayKey = getTodayKey();
    return rosterDates.length > 0 && rosterDates[0] < todayKey;
  }, [rosterDates]);
  return { hasPastDates };
};

const RosterHeader = memo(({ showPeek, children }: RosterHeaderProps) => {
  const dispatch = useAppDispatch();

  const handleLoadPrevious = () => dispatch(loadPreviousDates());

  return (
    <thead>
      <tr>
        <th className={`${styles.rosterTableHeaderCell} ${styles.stickyCol}`}>
          <div className={styles.dateHeaderContent}>
            <button
              className={styles.loadPrevBtn}
              onClick={handleLoadPrevious}
              title="Load previous dates"
            >
              <History size={16} />
            </button>
            <span className={styles.dateText}>Date</span>
          </div>
        </th>
        {children}
        {showPeek && <PeekHeader />}
      </tr>
    </thead>
  );
});

export default RosterHeader;
