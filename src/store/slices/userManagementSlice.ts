import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  query,
  writeBatch,
  doc,
} from "firebase/firestore";

import { db } from "../../firebase";
import { AppUser, generateIndexedAssignments } from "../../model/model";

type AppUserWithId = AppUser & { id: string };

interface UserManagementState {
  allUsers: AppUserWithId[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: UserManagementState = {
  allUsers: [],
  loading: false,
  saving: false,
  error: null,
};

export const fetchAllUsers = createAsyncThunk(
  "userManagement/fetchAllUsers",
  async (_, { rejectWithValue }) => {
    try {
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef);
      const querySnapshot = await getDocs(q);
      const users: AppUserWithId[] = [];
      querySnapshot.forEach((doc) => {
        users.push({ ...(doc.data() as AppUser), id: doc.id });
      });
      return users.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch all users",
      );
    }
  },
);

export const saveAllUserChanges = createAsyncThunk(
  "userManagement/saveAllChanges",
  async (users: AppUserWithId[], { rejectWithValue }) => {
    try {
      const batch = writeBatch(db);
      users.forEach((u) => {
        const { id, ...data } = u;
        // Recalculate indexedAssignments before saving
        if (data.teamPositions) {
          data.indexedAssignments = generateIndexedAssignments(
            data.teamPositions,
          );
        }
        batch.update(doc(db, "users", id), data);
      });
      await batch.commit();
      return;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to save changes",
      );
    }
  },
);

const userManagementSlice = createSlice({
  name: "userManagement",
  initialState,
  reducers: {
    updateUserField(
      state,
      action: PayloadAction<{
        id: string;
        field: keyof AppUser;
        value: AppUser[keyof AppUser];
      }>,
    ) {
      const { id, field, value } = action.payload;
      const user = state.allUsers.find((u) => u.id === id);
      if (user) {
        (user as Record<keyof AppUser, AppUser[keyof AppUser]>)[field] = value;
      }
    },
    toggleUserTeam(
      state,
      action: PayloadAction<{ userId: string; teamName: string }>,
    ) {
      const { userId, teamName } = action.payload;
      const user = state.allUsers.find((u) => u.id === userId);
      if (user) {
        const currentTeams = user.teams || [];
        const newTeams = currentTeams.includes(teamName)
          ? currentTeams.filter((t) => t !== teamName)
          : [...currentTeams, teamName];
        user.teams = newTeams;

        // Sync teamPositions
        if (!user.teamPositions) user.teamPositions = {};
        if (newTeams.includes(teamName)) {
          if (!user.teamPositions[teamName]) user.teamPositions[teamName] = [];
        } else {
          delete user.teamPositions[teamName];
        }
      }
    },
    toggleUserTeamPosition(
      state,
      action: PayloadAction<{
        userId: string;
        teamName: string;
        posName: string;
      }>,
    ) {
      const { userId, teamName, posName } = action.payload;
      const user = state.allUsers.find((u) => u.id === userId);
      if (user) {
        if (!user.teamPositions) user.teamPositions = {};
        if (!user.teamPositions[teamName]) user.teamPositions[teamName] = [];

        const currentPos = user.teamPositions[teamName];
        const newPos = currentPos.includes(posName)
          ? currentPos.filter((p) => p !== posName)
          : [...currentPos, posName];
        user.teamPositions[teamName] = newPos;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchAllUsers.fulfilled,
        (state, action: PayloadAction<AppUserWithId[]>) => {
          state.allUsers = action.payload;
          state.loading = false;
        },
      )
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      .addCase(saveAllUserChanges.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveAllUserChanges.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(saveAllUserChanges.rejected, (state, action) => {
        state.error = action.payload as string;
        state.saving = false;
      });
  },
});

export const {
  updateUserField,
  toggleUserTeam,
  toggleUserTeamPosition,
} = userManagementSlice.actions;
export const userManagementReducer = userManagementSlice.reducer;
