import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  query,
  writeBatch,
  doc,
  where,
} from "firebase/firestore";

import { db } from "../../firebase";
import { AppUser, generateIndexedAssignments } from "../../model/model";

type AppUserWithId = AppUser & { id: string };

interface UserManagementState {
  allUsers: AppUserWithId[];
  originalUsers: AppUserWithId[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: UserManagementState = {
  allUsers: [],
  originalUsers: [],
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

export const cleanupUsersAfterDeletion = createAsyncThunk(
  "userManagement/cleanupAfterDeletion",
  async (
    { teamId, teamName, positionId }: { teamId?: string; teamName?: string; positionId?: string },
    { rejectWithValue },
  ) => {
    try {
      const usersCollectionRef = collection(db, "users");
      let q;

      if (teamId) {
        q = query(usersCollectionRef, where("teams", "array-contains", teamId));
      } else if (positionId) {
        // Since we can't easily query by position inside teamPositions Record maps,
        // and indexedAssignments contains "TeamId|PositionId" which requires exact matches,
        // we'll fetch all users for position cleanup. This is less frequent.
        q = query(usersCollectionRef);
      } else {
        return;
      }

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      let count = 0;

      querySnapshot.forEach((userDoc) => {
        const userData = userDoc.data() as AppUser;
        let changed = false;
        const updates: Partial<AppUser> = {};

        if (teamId) {
          if (userData.teams?.includes(teamId) || (teamName && userData.teams?.includes(teamName))) {
            updates.teams = userData.teams.filter((id) => id !== teamId && id !== teamName);
            changed = true;
          }

          if (userData.teamPositions) {
            const newTeamPositions = { ...userData.teamPositions };
            let tpChanged = false;
            
            if (newTeamPositions[teamId]) {
              delete newTeamPositions[teamId];
              tpChanged = true;
            }
            if (teamName && newTeamPositions[teamName]) {
              delete newTeamPositions[teamName];
              tpChanged = true;
            }

            if (tpChanged) {
              updates.teamPositions = newTeamPositions;
              updates.indexedAssignments = generateIndexedAssignments(newTeamPositions);
              changed = true;
            }
          }
        }

        if (positionId) {
          if (userData.teamPositions) {
            let posChanged = false;
            const newTeamPositions: Record<string, string[]> = {};

            Object.entries(userData.teamPositions).forEach(([tId, posIds]) => {
              if (posIds.includes(positionId)) {
                newTeamPositions[tId] = posIds.filter((id) => id !== positionId);
                posChanged = true;
              } else {
                newTeamPositions[tId] = posIds;
              }
            });

            if (posChanged) {
              updates.teamPositions = newTeamPositions;
              updates.indexedAssignments = generateIndexedAssignments(newTeamPositions);
              changed = true;
            }
          }
        }

        if (changed) {
          batch.update(userDoc.ref, updates);
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
      }
      return count;
    } catch (error) {
      console.error("Cleanup error:", error);
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to cleanup users",
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
    reorderUserTeams(
      state,
      action: PayloadAction<{
        userId: string;
        newOrder: string[];
      }>,
    ) {
      const { userId, newOrder } = action.payload;
      const user = state.allUsers.find((u) => u.id === userId);
      if (user) {
        user.teams = newOrder;
      }
    },
    resetUserChanges(state) {
      state.allUsers = JSON.parse(JSON.stringify(state.originalUsers));
    },
    setAllUsers(state, action: PayloadAction<AppUserWithId[]>) {
      state.allUsers = action.payload;
      // Only update originalUsers if we are NOT currently saving/editing
      // but actually, for read-only sync, we want to update the "committed" state
      state.originalUsers = JSON.parse(JSON.stringify(action.payload));
      state.loading = false;
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
          state.originalUsers = JSON.parse(JSON.stringify(action.payload));
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
        state.originalUsers = JSON.parse(JSON.stringify(state.allUsers));
      })
      .addCase(saveAllUserChanges.rejected, (state, action) => {
        state.error = action.payload as string;
        state.saving = false;
      })
      .addCase(cleanupUsersAfterDeletion.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(cleanupUsersAfterDeletion.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(cleanupUsersAfterDeletion.rejected, (state, action) => {
        state.error = action.payload as string;
        state.saving = false;
      });
  },
});

export const {
  updateUserField,
  toggleUserTeam,
  toggleUserTeamPosition,
  reorderUserTeams,
  resetUserChanges,
  setAllUsers,
} = userManagementSlice.actions;
export const userManagementReducer = userManagementSlice.reducer;
