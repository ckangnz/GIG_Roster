import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { doc, getDoc } from "firebase/firestore";

import { db } from "../../firebase";
import { Team, Weekday, formatToDateKey } from "../../model/model";

export const getUpcomingDates = (
  preferredDays: Weekday[],
  startYear?: number,
  endYear?: number,
  team?: Team | null,
): string[] => {
  const dates: Date[] = [];
  const now = new Date();

  const isTodayExpired = (t: Team) => {
    const dayName = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(now) as Weekday;
    const endTimeStr = t.dayEndTimes?.[dayName] || "23:59";
    const [endH, endM] = endTimeStr.split(":").map(Number);
    const nowH = now.getHours();
    const nowM = now.getMinutes();
    return nowH > endH || (nowH === endH && nowM >= endM);
  };

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const currentYear = today.getFullYear();
  const effectiveStartYear = startYear || currentYear;
  const effectiveEndYear = endYear || currentYear;

  const weekdayMap: Record<Weekday, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const preferredDayNumbers = preferredDays.map((day) => weekdayMap[day]);

  let startDate: Date;
  if (effectiveStartYear === currentYear) {
    startDate = new Date(today);
    if (
      team &&
      preferredDayNumbers.includes(startDate.getDay()) &&
      isTodayExpired(team)
    ) {
      startDate.setDate(startDate.getDate() + 1);
    }
  } else {
    startDate = new Date(effectiveStartYear, 0, 1);
  }
  startDate.setHours(0, 0, 0, 0);

  const finalEndDate = new Date(effectiveEndYear, 11, 31);
  finalEndDate.setHours(23, 59, 59, 999);

  const currentDate = new Date(startDate);
  while (currentDate.getTime() <= finalEndDate.getTime()) {
    if (preferredDayNumbers.includes(currentDate.getDay())) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  dates.sort((a, b) => a.getTime() - b.getTime());

  return dates.map((date) => formatToDateKey(date));
};

const getPreviousDates = (
  preferredDays: Weekday[],
  earliestDateStr: string,
  count: number = 5,
): string[] => {
  const dates: Date[] = [];
  const earliestDate = new Date(earliestDateStr);
  earliestDate.setHours(0, 0, 0, 0);

  const weekdayMap: Record<Weekday, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const preferredDayNumbers = preferredDays.map((day) => weekdayMap[day]);
  const currentDate = new Date(earliestDate);

  while (dates.length < count) {
    currentDate.setDate(currentDate.getDate() - 1);
    if (preferredDayNumbers.includes(currentDate.getDay())) {
      dates.push(new Date(currentDate));
    }

    const limitDate = new Date(earliestDate);
    limitDate.setFullYear(limitDate.getFullYear() - 1);
    if (currentDate < limitDate) break;
  }

  return dates.map((date) => formatToDateKey(date)).sort();
};

interface RosterViewState {
  currentTeamData: Team | null;
  rosterDates: string[];
  loadingTeam: boolean;
  error: string | null;
  filterUserId: string | null;
  highlightedUserId: string | null;
}

const initialState: RosterViewState = {
  currentTeamData: null,
  rosterDates: [],
  loadingTeam: false,
  error: null,
  filterUserId: null,
  highlightedUserId: null,
};

export const fetchTeamDataForRoster = createAsyncThunk(
  "rosterView/fetchTeamData",
  async (
    { teamId, orgId }: { teamId: string; orgId: string },
    { rejectWithValue },
  ) => {
    if (!teamId || !orgId) return null;
    try {
      const teamsDocRef = doc(db, "organisations", orgId, "metadata", "teams");
      const teamsSnap = await getDoc(teamsDocRef);

      if (teamsSnap.exists()) {
        const data = teamsSnap.data();
        const allTeamsList: Team[] = Array.isArray(data.list)
          ? data.list.map((teamData: Team) => ({
              ...teamData,
              preferredDays: teamData.preferredDays || [],
              positions: teamData.positions || [],
            }))
          : [];
        const foundTeam = allTeamsList.find((team) => team.id === teamId);
        return foundTeam || null;
      }
      return null;
    } catch (err) {
      console.error("Error fetching team data:", err);
      return rejectWithValue("Failed to load team data.");
    }
  },
);

const rosterViewSlice = createSlice({
  name: "rosterView",
  initialState,
  reducers: {
    loadPreviousDates(state) {
      if (state.currentTeamData && state.rosterDates.length > 0) {
        const previous = getPreviousDates(
          state.currentTeamData.preferredDays,
          state.rosterDates[0],
        );
        state.rosterDates = [...previous, ...state.rosterDates];
      }
    },
    resetToUpcomingDates(state) {
      if (state.currentTeamData?.preferredDays) {
        state.rosterDates = getUpcomingDates(
          state.currentTeamData.preferredDays,
          undefined,
          undefined,
          state.currentTeamData,
        );
      }
    },
    loadNextYearDates(state) {
      if (state.currentTeamData && state.rosterDates.length > 0) {
        const lastDate = new Date(
          state.rosterDates[state.rosterDates.length - 1],
        );
        const nextYear = lastDate.getFullYear() + 1;
        const nextYearDates = getUpcomingDates(
          state.currentTeamData.preferredDays,
          nextYear,
          nextYear,
          state.currentTeamData,
        );
        state.rosterDates = [...state.rosterDates, ...nextYearDates];
      }
    },
    setFilterUserId(state, action: PayloadAction<string | null>) {
      state.filterUserId = action.payload;
    },
    setHighlightedUserId(state, action: PayloadAction<string | null>) {
      state.highlightedUserId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeamDataForRoster.pending, (state) => {
        state.loadingTeam = true;
        state.currentTeamData = null;
        state.rosterDates = [];
        state.error = null;
      })
      .addCase(
        fetchTeamDataForRoster.fulfilled,
        (state, action: PayloadAction<Team | null>) => {
          state.currentTeamData = action.payload;
          if (action.payload?.preferredDays) {
            state.rosterDates = getUpcomingDates(
              action.payload.preferredDays,
              undefined,
              undefined,
              action.payload,
            );
          }
          state.loadingTeam = false;
        },
      )
      .addCase(fetchTeamDataForRoster.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loadingTeam = false;
      });
  },
});

export const {
  loadPreviousDates,
  resetToUpcomingDates,
  loadNextYearDates,
  setFilterUserId,
  setHighlightedUserId,
} = rosterViewSlice.actions;
export const rosterViewReducer = rosterViewSlice.reducer;
