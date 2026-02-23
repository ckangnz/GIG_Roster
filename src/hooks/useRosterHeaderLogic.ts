import { useMemo } from "react";

import { useAppSelector } from "./redux";
import { getTodayKey } from "../model/model";

export const useRosterHeaderLogic = () => {
  const { rosterDates } = useAppSelector((state) => state.rosterView);
  const hasPastDates = useMemo(() => {
    const todayKey = getTodayKey();
    return rosterDates.length > 0 && rosterDates[0] < todayKey;
  }, [rosterDates]);
  return { hasPastDates };
};
