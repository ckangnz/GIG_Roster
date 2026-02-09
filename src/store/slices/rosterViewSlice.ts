import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

import { db } from '../../firebase';
import { AppUser, Team, Weekday } from '../../model/model';
import { RootState } from '../index';

// Helper function from RosterTable.tsx
export const getUpcomingDates = (preferredDays: Weekday[]): string[] => {
  const dates: Date[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const currentYear = now.getFullYear();
  const endOfYear = new Date(currentYear, 11, 31);
  endOfYear.setHours(0, 0, 0, 0);

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

  const startDate = new Date(now);
  let foundFirstDate = false;
  while (!foundFirstDate) {
    if (preferredDayNumbers.includes(startDate.getDay())) {
      foundFirstDate = true;
    } else {
      startDate.setDate(startDate.getDate() + 1);
      if (startDate.getFullYear() > currentYear) {
        return [];
      }
    }
  }

  const currentDate = new Date(startDate);
  while (currentDate.getTime() <= endOfYear.getTime()) {
    if (preferredDayNumbers.includes(currentDate.getDay())) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  dates.sort((a, b) => a.getTime() - b.getTime());

  return dates.map((date) => date.toISOString());
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

  return dates.map((date) => date.toISOString()).sort();
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
};

export const fetchAllTeamUsers = createAsyncThunk(
  'rosterView/fetchAllTeamUsers',
  async (teamName: string, { rejectWithValue }) => {
    if (!teamName) return [];
    try {
      const usersCollectionRef = collection(db, 'users');
      const q = query(usersCollectionRef, where('teams', 'array-contains', teamName));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: AppUser[] = [];
      querySnapshot.forEach((doc) => {
        fetchedUsers.push(doc.data() as AppUser);
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
    { teamName, positionName }: { teamName: string; positionName: string },
    { rejectWithValue, getState },
  ) => {
    if (!teamName || !positionName) return [];
    try {
      const state = getState() as RootState;
      const allPositions = state.positions.positions;

      // Find children of this position
      const children = allPositions.filter((p) => p.parentId === positionName);
      const positionGroup = [positionName, ...children.map((c) => c.name)];

      // Create indexed keys for all positions in the group
      const indexedKeys = positionGroup.map((pos) => `${teamName}|${pos}`);

      const usersCollectionRef = collection(db, 'users');
      const q = query(
        usersCollectionRef,
        where('indexedAssignments', 'array-contains-any', indexedKeys),
      );
      const querySnapshot = await getDocs(q);
      const fetchedUsers: AppUser[] = [];
      querySnapshot.forEach((doc) => {
        fetchedUsers.push(doc.data() as AppUser);
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
  async (teamName: string, { rejectWithValue }) => {
    if (!teamName) return null;
    try {
      const teamsDocRef = doc(db, 'metadata', 'teams');
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
        const foundTeam = allTeamsList.find((team) => team.name === teamName);
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
        state.rosterDates = getUpcomingDates(state.currentTeamData.preferredDays);
      }
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
          state.rosterDates = getUpcomingDates(action.payload.preferredDays);
        }
        state.loadingTeam = false;
      })
      .addCase(fetchTeamDataForRoster.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loadingTeam = false;
      });
  },
});

export const { loadPreviousDates, resetToUpcomingDates } = rosterViewSlice.actions;
export const rosterViewReducer = rosterViewSlice.reducer;
