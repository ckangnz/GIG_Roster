import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { db } from "../../firebase";
import { Team } from "../../model/model";

interface TeamsState {
  teams: Team[];
  loading: boolean;
  error: string | null;
  fetched: boolean;
}

const initialState: TeamsState = {
  teams: [],
  loading: false,
  error: null,
  fetched: false,
};

export const fetchTeams = createAsyncThunk(
  "teams/fetchTeams",
  async (_, { rejectWithValue }) => {
    try {
      const docRef = doc(db, "metadata", "teams");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const teamsList = Array.isArray(data.list)
          ? data.list.map((teamData: Team) => ({
              ...teamData,
              id: teamData.id || teamData.name,
              maxConflict: teamData.maxConflict || 1,
              // Convert object-based positions to ID-based if necessary
              positions: (teamData.positions || []).map((p: string | { id?: string; name?: string }) => 
                typeof p === 'string' ? p : (p.id || '')
              )
            }))
          : [];
        return teamsList;
      }
      return [];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch teams",
      );
    }
  },
);

export const updateTeams = createAsyncThunk(
  "teams/updateTeams",
  async (teams: Team[], { rejectWithValue }) => {
    try {
      const docRef = doc(db, "metadata", "teams");
      await setDoc(docRef, { list: teams });
      return teams;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update teams",
      );
    }
  },
);

const teamsSlice = createSlice({
  name: "teams",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setTeams: (state, action: PayloadAction<Team[]>) => {
      state.teams = action.payload;
      state.fetched = true;
      state.loading = false;
    },
    removePositionFromAllTeams: (state, action: PayloadAction<string>) => {
      const positionId = action.payload;
      state.teams = state.teams.map(team => ({
        ...team,
        positions: (team.positions || []).filter(pId => pId !== positionId)
      }));
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
        state.fetched = true;
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

export const { clearError, setTeams, removePositionFromAllTeams } = teamsSlice.actions;
export const teamsReducer = teamsSlice.reducer;
