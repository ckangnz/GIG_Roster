import { useCallback, useMemo, useRef, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import {
  getTodayKey,
  RosterEntry,
  getAssignmentsForTeam,
  Team,
  Weekday,
} from "../../model/model";
import {
  loadPreviousDates,
  resetToUpcomingDates,
  loadNextYearDates,
} from "../../store/slices/rosterViewSlice";
import {
  toggleUserVisibility,
  setFocusedCell,
  FocusedCell,
} from "../../store/slices/uiSlice";
import { useAppDispatch, useAppSelector } from "../redux";

export const useRosterUI = (
  teamId?: string,
  activePositionId?: string,
  rosterDates: string[] = [],
  entries: Record<string, RosterEntry> = {},
) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { teams } = useAppSelector((state) => state.teams);
  const currentTeam = useMemo(
    () => teams.find((t) => t.id === teamId),
    [teams, teamId],
  );

  const { hiddenUsers, rosterAllViewMode, peekPositionName, focusedCell } =
    useAppSelector((state) => state.ui);

  const containerRef = useRef<HTMLDivElement>(null);

  const isTeamExpired = useCallback((team: Team, dateStr: string) => {
    const todayKey = getTodayKey();
    if (dateStr !== todayKey) return false;

    const dateObj = new Date(dateStr);
    const dayName = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(dateObj) as Weekday;
    const endTimeStr = team.dayEndTimes?.[dayName] || "23:59";

    const [endH, endM] = endTimeStr.split(":").map(Number);

    const now = new Date();
    const nowH = now.getHours();
    const nowM = now.getMinutes();

    return nowH > endH || (nowH === endH && nowM >= endM);
  }, []);

  const getRowClass = useCallback(
    (dateString: string) => {
      const todayKey = getTodayKey();
      const dateKey = dateString.split("T")[0];
      if (dateKey < todayKey) return "past-date";
      if (dateKey === todayKey) {
        if (currentTeam && isTeamExpired(currentTeam, dateKey))
          return "past-date";
        return "today-date";
      }
      return "future-date";
    },
    [currentTeam, isTeamExpired],
  );

  const closestNextDate = useMemo(() => {
    const today = getTodayKey();
    return rosterDates.find((d) => {
      const dateKey = d.split("T")[0];
      if (dateKey < today) return false;
      if (dateKey === today) {
        if (currentTeam && isTeamExpired(currentTeam, dateKey)) return false;
      }
      return true;
    });
  }, [rosterDates, currentTeam, isTeamExpired]);

  // Focus Handling
  useEffect(() => {
    const handleOutsideClick = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        dispatch(setFocusedCell(null));
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", handleOutsideClick);
  }, [dispatch]);

  const internalSetFocusedCell = useCallback(
    (cell: FocusedCell | null) => {
      dispatch(setFocusedCell(cell));
    },
    [dispatch],
  );

  // Visibility Handling
  const handleToggleVisibility = useCallback(
    (userEmail: string) => {
      if (!teamId || !activePositionId) return;
      dispatch(
        toggleUserVisibility({
          teamId,
          positionId: activePositionId,
          userEmail,
        }),
      );
    },
    [dispatch, teamId, activePositionId],
  );

  const hiddenUserList = useMemo(() => {
    if (!teamId || !activePositionId) return [];
    return hiddenUsers[teamId]?.[activePositionId] || [];
  }, [hiddenUsers, teamId, activePositionId]);

  // Date/Navigation Handling
  const handleLoadPrevious = useCallback(
    () => dispatch(loadPreviousDates()),
    [dispatch],
  );
  const handleResetDates = useCallback(
    () => dispatch(resetToUpcomingDates()),
    [dispatch],
  );
  const handleLoadNextYear = useCallback(
    () => dispatch(loadNextYearDates()),
    [dispatch],
  );

  const checkHasAssignments = useCallback(
    (dateString: string) => {
      const dateKey = dateString.split("T")[0];
      const entry = entries[dateKey];
      if (!entry) return false;
      return Object.keys(entry.teams).some((tId) => {
        const teamAssignments = getAssignmentsForTeam(entry, tId);
        return Object.values(teamAssignments).some(
          (posList) => Array.isArray(posList) && posList.length > 0,
        );
      });
    },
    [entries],
  );

  const handleDateClick = useCallback(
    (dateString: string) => {
      if (checkHasAssignments(dateString)) {
        navigate(`/app/dashboard?date=${dateString}`);
      }
    },
    [checkHasAssignments, navigate],
  );

  const hasPastDates = useMemo(() => {
    const today = getTodayKey();
    return rosterDates.length > 0 && rosterDates[0] < today;
  }, [rosterDates]);

  return {
    navigate,
    containerRef,
    focusedCell,
    setFocusedCell: internalSetFocusedCell,
    hiddenUserList,
    rosterAllViewMode,
    peekPositionName,
    handleToggleVisibility,
    handleLoadPrevious,
    handleResetDates,
    handleLoadNextYear,
    handleDateClick,
    getRowClass,
    hasPastDates,
    closestNextDate,
    checkHasAssignments,
    todayKey: getTodayKey(),
  };
};
