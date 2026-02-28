import { useMemo } from "react";

import { RosterSlot, Team } from "../model/model";

export interface VisualRow {
  dateString: string;
  slot?: RosterSlot;
  isFirstSlot: boolean;
  isLastSlot: boolean;
  dateRowIndex: number; // original index in rosterDates
}

export const useRosterVisualRows = (
  rosterDates: string[],
  currentTeam: Team | null,
  isSlotted: boolean
): VisualRow[] => {
  return useMemo(() => {
    const rows: VisualRow[] = [];
    rosterDates.forEach((dateString, dateRowIndex) => {
      if (isSlotted && currentTeam?.slots && currentTeam.slots.length > 0) {
        const slots = currentTeam.slots;
        slots.forEach((slot, idx) => {
          rows.push({
            dateString,
            slot,
            isFirstSlot: idx === 0,
            isLastSlot: idx === slots.length - 1,
            dateRowIndex,
          });
        });
      } else {
        rows.push({
          dateString,
          isFirstSlot: true,
          isLastSlot: true,
          dateRowIndex,
        });
      }
    });
    return rows;
  }, [rosterDates, currentTeam, isSlotted]);
};
