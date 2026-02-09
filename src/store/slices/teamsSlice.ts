import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { db } from '../../firebase';
import { Team } from '../../model/model';

interface TeamsState {
  teams: Team[];
  loading: boolean;
  error: string | null;
}

const initialState: TeamsState = {
  teams: [],
  loading: false,
  error: null,
};

export const fetchTeams = createAsyncThunk('teams/fetchTeams', async (_, { rejectWithValue }) => {
  try {
    const docRef = doc(db, 'metadata', 'teams');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return Array.isArray(data.list) ? data.list : [];
    }
    return [];
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch teams');
  }
});

export const updateTeams = createAsyncThunk(
  'teams/updateTeams',
  async (teams: Team[], { rejectWithValue }) => {
    try {
      const docRef = doc(db, 'metadata', 'teams');
      await updateDoc(docRef, { list: teams });
      return teams;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update teams');
    }
  },
);

const teamsSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.teams = action.payload;
        state.loading = false;
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      .addCase(updateTeams.pending, (state) => {
        state.error = null;
      })
      .addCase(updateTeams.fulfilled, (state, action) => {
        state.teams = action.payload;
      })
      .addCase(updateTeams.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = teamsSlice.actions;
export const teamsReducer = teamsSlice.reducer;
