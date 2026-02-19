import { ReactNode, memo, useMemo } from "react";

import { PeekCell } from "./Peek/PeekCell";
import { getTodayKey, RosterEntry } from "../../model/model";

import styles from "./roster-row.module.css";

interface RosterRowProps {
  dateString: string;
  entries: Record<string, RosterEntry>;
  dirtyEntries: Record<string, RosterEntry>;
  onDateClick: (date: string) => void;
  closestNextDate?: string | null;
  showPeek?: boolean;
  children: ReactNode;
}

const RosterRow = memo(
  ({
    dateString,
    entries,
    dirtyEntries,
    onDateClick,
    closestNextDate,
    showPeek,
    children,
  }: RosterRowProps) => {
    const todayKey = useMemo(() => getTodayKey(), []);
    const dateKey = dateString.split("T")[0];
    
    const isToday = dateKey === todayKey;
    const isPast = dateKey < todayKey;
    
    const entry = dirtyEntries[dateKey] || entries[dateKey];
    const eventName = entry?.eventName;
    
    const hasData = useMemo(() => {
      if (!entry) return false;
      return Object.values(entry.teams).some((teamAssignments) =>
        Object.values(teamAssignments).some((posList) => posList.length > 0),
      );
    }, [entry]);

    const trClasses = [
      isPast ? styles.pastDate : "",
      isToday ? styles.todayDate : styles.futureDate,
      !hasData ? styles.noData : "",
      eventName ? styles.specialEventRow : "",
      dateString === closestNextDate ? styles.closestNextDateRow : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <tr className={trClasses}>
        <td
          className={`${styles.dateCell} ${styles.stickyCol} ${hasData ? styles.clickable : ""}`}
          onClick={() => onDateClick(dateString)}
          title={eventName}
        >
          <div className={styles.dateCellContent}>
            {eventName && <span className={styles.specialEventDot} />}
            {isToday && (
              <span className={styles.rosterTodayDot} title="Today" />
            )}
            {new Date(dateString.replace(/-/g, "/")).toLocaleDateString()}
          </div>
        </td>
        {children}
        {showPeek && <PeekCell dateString={dateString} />}
      </tr>
    );
  },
);

export default RosterRow;
