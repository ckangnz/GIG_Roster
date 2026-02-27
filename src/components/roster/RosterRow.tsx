import { ReactNode, memo, useMemo } from "react";

import { PeekCell } from "./Peek/PeekCell";
import { getTodayKey, RosterEntry, formatDisplayDate } from "../../model/model";

import styles from "./roster-row.module.css";

interface RosterRowProps {
  dateString: string;
  entries: Record<string, RosterEntry>;
  onDateClick: (date: string) => void;
  closestNextDate?: string | null;
  showPeek?: boolean;
  children: ReactNode;
}

const RosterRow = memo(
  ({
    dateString,
    entries,
    onDateClick,
    closestNextDate,
    showPeek,
    children,
  }: RosterRowProps) => {
    const todayKey = useMemo(() => getTodayKey(), []);
    const dateKey = dateString.split("T")[0];

    const isToday = dateKey === todayKey;
    const isPast = dateKey < todayKey;

    const entry = entries[dateKey];
    const eventName = entry?.eventName;

    const hasOpenRequest = useMemo(() => {
      if (!entry?.coverageRequests) return false;
      return Object.values(entry.coverageRequests).some(req => req.status === "open");
    }, [entry]);

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
      hasOpenRequest ? styles.rowNeedsCoverage : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <tr className={trClasses}>
        <td
          className={`${styles.dateCell} ${styles.stickyCol} ${hasData ? styles.clickable : ""} ${hasOpenRequest ? styles.needsCoverage : ""}`}
          onClick={() => onDateClick(dateString)}
          title={eventName}
        >
          <div className={`${styles.dateCellContent} ${hasOpenRequest ? styles.dateTextWarning : ""}`}>
            {eventName && <span className={styles.specialEventDot} />}
            {isToday && (
              <span className={styles.rosterTodayDot} title="Today" />
            )}
            {formatDisplayDate(dateKey)}
          </div>
        </td>
        {children}
        {showPeek && <PeekCell dateString={dateString} />}
      </tr>
    );
  },
);

export default RosterRow;
