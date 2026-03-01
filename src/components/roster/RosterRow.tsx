import { ReactNode, memo, useMemo } from "react";

import { useTranslation } from "react-i18next";

import { PeekCell } from "./Peek/PeekCell";
import { RosterEntry, formatDisplayDate, RosterSlot, getAssignmentsForTeam, isTeamRosterData } from "../../model/model";

import styles from "./roster-row.module.css";

interface RosterRowProps {
  dateString: string;
  entries: Record<string, RosterEntry>;
  onDateClick: (date: string) => void;
  closestNextDate?: string | null;
  showPeek?: boolean;
  children: ReactNode;
  hasPositionRequest?: boolean;
  isToday?: boolean;
  isPast?: boolean;
  // Slotted mode props
  slot?: RosterSlot;
  isFirstSlot?: boolean;
  isLastSlot?: boolean;
}

const RosterRow = memo(
  ({
    dateString,
    entries,
    onDateClick,
    closestNextDate,
    showPeek,
    children,
    hasPositionRequest = false,
    isToday = false,
    isPast = false,
    slot,
    isFirstSlot = true,
    isLastSlot = true,
  }: RosterRowProps) => {
    const { t } = useTranslation();
    const dateKey = dateString.split("T")[0];

    const entry = entries[dateKey];
    const eventName = entry?.eventName;

    const hasData = useMemo(() => {
      if (!entry) return false;
      // If this is a specific slot row
      if (slot) {
        return Object.keys(entry.teams).some(tId => {
          const teamData = entry.teams[tId];
          if (isTeamRosterData(teamData) && teamData.type === 'slotted') {
            const slotAssignments = teamData.slots?.[slot.id] || {};
            return Object.values(slotAssignments).some((list: string[]) => list.length > 0);
          }
          return false;
        });
      }
      // Daily mode logic
      return Object.keys(entry.teams).some((tId) => {
        const assignments = getAssignmentsForTeam(entry, tId);
        return Object.values(assignments).some((posList) => posList.length > 0);
      });
    }, [entry, slot]);

    const trClasses = [
      isPast ? styles.pastDate : "",
      isToday ? styles.todayDate : styles.futureDate,
      !hasData && !slot ? styles.noData : "",
      eventName ? styles.specialEventRow : "",
      dateString === closestNextDate ? styles.closestNextDateRow : "",
      hasPositionRequest ? styles.rowNeedsCoverage : "",
      slot ? styles.slottedRow : "",
      !isFirstSlot ? styles.subsequentSlotRow : "",
      isLastSlot && (isToday || dateString === closestNextDate) ? styles.slottedGroupBottom : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <tr className={trClasses}>
        <td
          className={`${styles.dateCell} ${styles.stickyCol} ${hasData ? styles.clickable : ""} ${hasPositionRequest ? styles.needsCoverage : ""}`}
          onClick={() => onDateClick(dateString)}
          title={eventName}
        >
          <div className={`${styles.dateCellContent} ${hasPositionRequest ? styles.dateTextWarning : ""}`}>
            {isFirstSlot && (
              <>
                {eventName && <span className={styles.specialEventDot} />}
                {isToday && (
                  <span className={styles.rosterTodayDot} title={t('common.today')} />
                )}
                {formatDisplayDate(dateKey)}
              </>
            )}
            {slot && (
              <div className={styles.slotTimeLabel}>
                {slot.startTime}
              </div>
            )}
          </div>
        </td>
        {children}
        {showPeek && isFirstSlot && <PeekCell dateString={dateString} />}
        {showPeek && !isFirstSlot && <td className={styles.peekPlaceholder} />}
      </tr>
    );
  },
);

export default RosterRow;
