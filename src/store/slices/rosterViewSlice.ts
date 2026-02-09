import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

import { db } from '../../firebase';
import { AppUser, Team, Weekday } from '../../model/model';

// Helper function from RosterTable.tsx
const getUpcomingDates = (preferredDays: Weekday[]): string[] => {
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

  return dates.map(date => date.toISOString());
};


interface RosterViewState {
  users: AppUser[];
  currentTeamData: Team | null;
  rosterDates: string[];
  loadingUsers: boolean;
  loadingTeam: boolean;
  error: string | null;
}

const initialState: RosterViewState = {
  users: [],
  currentTeamData: null,
  rosterDates: [],
  loadingUsers: false,
  loadingTeam: false,
  error: null,
};

export const fetchUsersByTeamAndPosition = createAsyncThunk(
  'rosterView/fetchUsers',
  async (
    { teamName, positionName }: { teamName: string; positionName: string },
    { rejectWithValue },
  ) => {
    if (!teamName || !positionName) return [];
    try {
      const usersCollectionRef = collection(db, 'users');
      const q = query(
        usersCollectionRef,
        where('indexedAssignments', 'array-contains', `${teamName}|${positionName}`),
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
  reducers: {},
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

export const rosterViewReducer = rosterViewSlice.reducer;
