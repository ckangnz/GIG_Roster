import { useCallback, useMemo, useRef, useEffect } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";

import { getTodayKey, RosterEntry, TeamAssignments } from "../../model/model";
import { 
  loadPreviousDates, 
  resetToUpcomingDates, 
  loadNextYearDates 
} from "../../store/slices/rosterViewSlice";
import { 
  toggleUserVisibility, 
  setFocusedCell, 
  FocusedCell 
} from "../../store/slices/uiSlice";
import { useAppDispatch, useAppSelector } from "../redux";

export const useRosterUI = (
  teamName?: string, 
  activePosition?: string,
  rosterDates: string[] = [],
  entries: Record<string, RosterEntry> = {}
) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const { hiddenUsers, rosterAllViewMode, peekPositionName, focusedCell } = useAppSelector(
    (state) => state.ui,
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Focus Handling
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        dispatch(setFocusedCell(null));
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dispatch]);

  const internalSetFocusedCell = useCallback((cell: FocusedCell | null) => {
    dispatch(setFocusedCell(cell));
  }, [dispatch]);

  // Auto-focus logic for linked dates
  useEffect(() => {
    const targetDate = searchParams.get("date");
    if (targetDate && rosterDates.length > 0 && !focusedCell) {
      const rowIndex = rosterDates.indexOf(targetDate);
      if (rowIndex !== -1) {
        dispatch(setFocusedCell({ row: rowIndex, col: 0, table: "roster" }));
      }
    }
  }, [searchParams, rosterDates, dispatch, focusedCell]);

  // Visibility Handling
  const handleToggleVisibility = useCallback((userEmail: string) => {
    if (!teamName || !activePosition) return;
    dispatch(
      toggleUserVisibility({
        teamName,
        positionName: activePosition,
        userEmail,
      }),
    );
  }, [dispatch, teamName, activePosition]);

  const hiddenUserList = useMemo(() => {
    if (!teamName || !activePosition) return [];
    return hiddenUsers[teamName]?.[activePosition] || [];
  }, [hiddenUsers, teamName, activePosition]);

  // Date/Navigation Handling
  const handleLoadPrevious = useCallback(() => dispatch(loadPreviousDates()), [dispatch]);
  const handleResetDates = useCallback(() => dispatch(resetToUpcomingDates()), [dispatch]);
  const handleLoadNextYear = useCallback(() => dispatch(loadNextYearDates()), [dispatch]);

  const checkHasAssignments = useCallback(
    (dateString: string) => {
      const dateKey = dateString.split("T")[0];
      const entry = entries[dateKey];
      if (!entry) return false;
      return Object.values(entry.teams).some((teamAssignments: TeamAssignments) =>
        Object.values(teamAssignments).some((posList) => Array.isArray(posList) && posList.length > 0),
      );
    },
    [entries],
  );

  const handleDateClick = useCallback((dateString: string) => {
    if (checkHasAssignments(dateString)) {
      navigate(`/app/dashboard?date=${dateString}`);
    }
  }, [checkHasAssignments, navigate]);

  const getRowClass = useCallback((dateString: string) => {
    const todayKey = getTodayKey();
    const dateKey = dateString.split("T")[0];
    if (dateKey < todayKey) return "past-date";
    if (dateKey === todayKey) return "today-date";
    return "future-date";
  }, []);

  const hasPastDates = useMemo(() => {
    const today = getTodayKey();
    return rosterDates.length > 0 && rosterDates[0] < today;
  }, [rosterDates]);

  const closestNextDate = useMemo(() => {
    const today = getTodayKey();
    return rosterDates.find((d) => d.split("T")[0] >= today);
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
