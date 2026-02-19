import { ReactNode, memo, useMemo } from "react";

import { PeekHeader } from "./Peek/PeekHeader";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { getTodayKey } from "../../model/model";
import {
  loadPreviousDates,
  resetToUpcomingDates,
} from "../../store/slices/rosterViewSlice";

import styles from "./roster-header.module.css";

interface RosterHeaderProps {
  showPeek?: boolean;
  children: ReactNode;
}

const RosterHeader = memo(({ showPeek, children }: RosterHeaderProps) => {
  const dispatch = useAppDispatch();
  const { rosterDates } = useAppSelector((state) => state.rosterView);

  const hasPastDates = useMemo(() => {
    const todayKey = getTodayKey();
    return rosterDates.length > 0 && rosterDates[0] < todayKey;
  }, [rosterDates]);

  const handleLoadPrevious = () => dispatch(loadPreviousDates());
  const handleResetDates = () => dispatch(resetToUpcomingDates());

  return (
    <thead>
      <tr>
        <th className={`${styles.rosterTableHeaderCell} ${styles.stickyCol}`}>
          <div className={styles.dateHeaderContent}>
            Date
            <div className={styles.dateHeaderActions}>
              <button
                className={styles.loadPrevBtn}
                onClick={handleLoadPrevious}
                title="Load previous dates"
              >
                ↑
              </button>
              {hasPastDates && (
                <button
                  className={`${styles.loadPrevBtn} ${styles.resetDatesBtn}`}
                  onClick={handleResetDates}
                  title="Reset dates"
                >
                  ↓
                </button>
              )}
            </div>
          </div>
        </th>
        {children}
        {showPeek && <PeekHeader />}
      </tr>
    </thead>
  );
});

export default RosterHeader;
