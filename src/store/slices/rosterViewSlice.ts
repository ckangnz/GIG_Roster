import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

import { db } from '../../firebase';
import { AppUser, Team, Weekday, formatToDateKey, OrgMembership } from '../../model/model';
import { RootState } from '../index';

// Helper function from RosterTable.tsx
export const getUpcomingDates = (
  preferredDays: Weekday[],
  startYear?: number,
  endYear?: number,
  team?: Team | null,
): string[] => {
  const dates: Date[] = [];
  const now = new Date();
  
  // Helper to check if today is expired for this team
  const isTodayExpired = (t: Team) => {
    const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now) as Weekday;
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
    // If today matches but is expired, start from tomorrow
    if (team && preferredDayNumbers.includes(startDate.getDay()) && isTodayExpired(team)) {
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

const getPreviousDates = (preferredDays: Weekday[], earliestDateStr: string, count: number = 5): string[] => {
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
    // Safety check to prevent infinite loops if no days are selected (shouldn't happen with proper validation)
    if (preferredDayNumbers.includes(currentDate.getDay())) {
      dates.push(new Date(currentDate));
    }
    
    // Stop if we go back too far (e.g., more than a year from the earliest date)
    const limitDate = new Date(earliestDate);
    limitDate.setFullYear(limitDate.getFullYear() - 1);
    if (currentDate < limitDate) break;
  }

  return dates.map((date) => formatToDateKey(date)).sort();
};

interface RosterViewState {
  users: AppUser[];
  allTeamUsers: AppUser[];
  currentTeamData: Team | null;
  rosterDates: string[];
  loadingUsers: boolean;
  loadingTeam: boolean;
  loadingAllTeamUsers: boolean;
  error: string | null;
  filterUserId: string | null;
  highlightedUserId: string | null;
}

const initialState: RosterViewState = {
  users: [],
  allTeamUsers: [],
  currentTeamData: null,
  rosterDates: [],
  loadingUsers: false,
  loadingTeam: false,
  loadingAllTeamUsers: false,
  error: null,
  filterUserId: null,
  highlightedUserId: null,
};

export const fetchAllTeamUsers = createAsyncThunk(
  'rosterView/fetchAllTeamUsers',
  async ({ teamId, orgId }: { teamId: string, orgId: string }, { rejectWithValue }) => {
    if (!teamId || !orgId) return [];
    try {
      // 1. Fetch memberships from sub-collection
      const memSnap = await getDocs(collection(db, 'organisations', orgId, 'memberships'));
      const memberships: Record<string, OrgMembership> = {};
      memSnap.forEach(doc => {
        memberships[doc.id] = doc.data() as OrgMembership;
      });

      // 2. Fetch corresponding users
      const usersSnap = await getDocs(collection(db, 'users'));
      const fetchedUsers: AppUser[] = [];
      
      usersSnap.forEach((uDoc) => {
        const memData = memberships[uDoc.id];
        if (memData && memData.teams?.includes(teamId)) {
          const userData = uDoc.data() as AppUser;
          fetchedUsers.push({
            ...userData,
            id: uDoc.id,
            // Inject virtual organisations map for component compatibility
            organisations: { [orgId]: memData } as Record<string, OrgMembership>
          });
        }
      });

      return fetchedUsers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (err) {
      console.error('Error fetching team users:', err);
      return rejectWithValue('Failed to load team users.');
    }
  },
);

export const fetchUsersByTeamAndPosition = createAsyncThunk(
  'rosterView/fetchUsers',
  async (
    { teamId, positionId, orgId }: { teamId: string; positionId: string; orgId: string },
    { rejectWithValue, getState },
  ) => {
    if (!teamId || !positionId || !orgId) return [];
    try {
      const state = getState() as RootState;
      const allPositions = state.positions.positions;

      // Find children of this position
      const children = allPositions.filter((p) => p.parentId === positionId);
      const positionGroup = [positionId, ...children.map((c) => c.id)];

      // Create indexed keys for all positions in the group (ID|ID)
      const indexedKeys = positionGroup.map((posId) => `${teamId}|${posId}`);

      // 1. Fetch memberships from sub-collection
      const memSnap = await getDocs(collection(db, 'organisations', orgId, 'memberships'));
      const memberships: Record<string, OrgMembership> = {};
      memSnap.forEach(doc => {
        memberships[doc.id] = doc.data() as OrgMembership;
      });

      // 2. Fetch corresponding users
      const usersSnap = await getDocs(collection(db, 'users'));
      const fetchedUsers: AppUser[] = [];
      
      usersSnap.forEach((uDoc) => {
        const memData = memberships[uDoc.id];
        if (memData) {
          const hasAssignment = memData.indexedAssignments?.some((ia: string) => indexedKeys.includes(ia));
          if (hasAssignment) {
            const userData = uDoc.data() as AppUser;
            fetchedUsers.push({
              ...userData,
              id: uDoc.id,
              // Inject virtual organisations map for component compatibility
              organisations: { [orgId]: memData } as Record<string, OrgMembership>
            });
          }
        }
      });

      return fetchedUsers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (err) {
      console.error('Error fetching users:', err);
      return rejectWithValue('Failed to load users.');
    }
  },
);

export const fetchTeamDataForRoster = createAsyncThunk(
  'rosterView/fetchTeamData',
  async ({ teamId, orgId }: { teamId: string, orgId: string }, { rejectWithValue }) => {
    if (!teamId || !orgId) return null;
    try {
      const teamsDocRef = doc(db, 'organisations', orgId, 'metadata', 'teams');
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
        // Match by ID
        const foundTeam = allTeamsList.find((team) => team.id === teamId);
        return foundTeam || null;
      }
      return null;
    } catch (err) {
      console.error('Error fetching team data:', err);
      return rejectWithValue('Failed to load team data.');
    }
  }
);

const rosterViewSlice = createSlice({
  name: 'rosterView',
  initialState,
  reducers: {
    loadPreviousDates(state) {
      if (state.currentTeamData && state.rosterDates.length > 0) {
        const previous = getPreviousDates(
          state.currentTeamData.preferredDays,
          state.rosterDates[0]
        );
        state.rosterDates = [...previous, ...state.rosterDates];
      }
    },
    resetToUpcomingDates(state) {
      if (state.currentTeamData?.preferredDays) {
        state.rosterDates = getUpcomingDates(state.currentTeamData.preferredDays, undefined, undefined, state.currentTeamData);
      }
    },
    loadNextYearDates(state) {
      if (state.currentTeamData && state.rosterDates.length > 0) {
        const lastDate = new Date(state.rosterDates[state.rosterDates.length - 1]);
        const nextYear = lastDate.getFullYear() + 1;
        const nextYearDates = getUpcomingDates(
          state.currentTeamData.preferredDays,
          nextYear,
          nextYear,
          state.currentTeamData
        );
        state.rosterDates = [...state.rosterDates, ...nextYearDates];
      }
    },
    setFilterUserId(state, action: PayloadAction<string | null>) {
      state.filterUserId = action.payload;
    },
    setHighlightedUserId(state, action: PayloadAction<string | null>) {
      state.highlightedUserId = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsersByTeamAndPosition.pending, (state) => {
        state.loadingUsers = true;
        state.users = [];
        state.error = null;
      })
      .addCase(
        fetchUsersByTeamAndPosition.fulfilled,
        (state, action: PayloadAction<AppUser[]>) => {
          state.users = action.payload;
          state.loadingUsers = false;
        },
      )
      .addCase(fetchUsersByTeamAndPosition.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loadingUsers = false;
      })
      // Fetch All Team Users
      .addCase(fetchAllTeamUsers.pending, (state) => {
        state.loadingAllTeamUsers = true;
        state.allTeamUsers = [];
      })
      .addCase(fetchAllTeamUsers.fulfilled, (state, action: PayloadAction<AppUser[]>) => {
        state.allTeamUsers = action.payload;
        state.loadingAllTeamUsers = false;
      })
      .addCase(fetchAllTeamUsers.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loadingAllTeamUsers = false;
      })
      // Fetch Team Data
      .addCase(fetchTeamDataForRoster.pending, (state) => {
        state.loadingTeam = true;
        state.currentTeamData = null;
        state.rosterDates = [];
        state.error = null;
      })
      .addCase(fetchTeamDataForRoster.fulfilled, (state, action: PayloadAction<Team | null>) => {
        state.currentTeamData = action.payload;
        if (action.payload?.preferredDays) {
          state.rosterDates = getUpcomingDates(action.payload.preferredDays, undefined, undefined, action.payload);
        }
        state.loadingTeam = false;
      })
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
