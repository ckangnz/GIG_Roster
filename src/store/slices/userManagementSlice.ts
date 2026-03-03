import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";

import { AuthState } from "./authSlice";
import { db } from "../../firebase";
import { OrgMembership, AppUser, generateIndexedAssignments } from "../../model/model";

type AppUserWithId = AppUser & { id: string };

interface UserManagementState {
  allUsers: AppUserWithId[];
  originalUsers: AppUserWithId[];
  memberships: Record<string, OrgMembership>; // userId -> OrgMembership
  profiles: Record<string, AppUser>; // userId -> AppUser
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: UserManagementState = {
  allUsers: [],
  originalUsers: [],
  memberships: {},
  profiles: {},
  loading: false,
  saving: false,
  error: null,
};

export const fetchAllUsers = createAsyncThunk(
  "userManagement/fetchAllUsers",
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthState };
      const activeOrgId = state.auth.activeOrgId;
      if (!activeOrgId) return [];

      // 1. Fetch all memberships for this org
      const memSnap = await getDocs(collection(db, "organisations", activeOrgId, "memberships"));
      const memberships: Record<string, OrgMembership> = {};
      memSnap.forEach(d => {
        memberships[d.id] = { ...(d.data() as OrgMembership), id: d.id };
      });

      // 2. Fetch corresponding users
      const userIds = Object.keys(memberships);
      if (userIds.length === 0) return [];

      const users: AppUserWithId[] = [];
      const usersSnap = await getDocs(collection(db, "users"));
      usersSnap.forEach(uDoc => {
        if (memberships[uDoc.id]) {
          const userData = uDoc.data() as AppUser;
          users.push({
            ...userData,
            id: uDoc.id,
            // TODO: Cleanup - After organisations root Map is removed, remove this virtual map injection
            // Inject the specific membership into a virtual organisations map for UI compatibility
            organisations: {
              [activeOrgId]: memberships[uDoc.id]
            } as Record<string, OrgMembership>
          });
        }
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
  async (users: AppUserWithId[], { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthState };
      const activeOrgId = state.auth.activeOrgId;
      if (!activeOrgId) throw new Error("Active Org ID missing");

      const batch = writeBatch(db);
      users.forEach((u) => {
        const { id, name, gender, organisations } = u;
        
        // 1. Update Global User Data
        batch.update(doc(db, "users", id), { name, gender });

        // 2. Update Membership Data
        const orgs = organisations as unknown as Record<string, OrgMembership>;
        const memEntry = orgs?.[activeOrgId];
        if (memEntry) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _unused, ...memData } = memEntry;
          if (memData.teamPositions) {
            memData.indexedAssignments = generateIndexedAssignments(memData.teamPositions);
          }
          batch.set(doc(db, "organisations", activeOrgId, "memberships", id), memData, { merge: true });
        }
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
    { rejectWithValue, getState },
  ) => {
    try {
      const state = getState() as { auth: AuthState };
      const activeOrgId = state.auth.activeOrgId;
      if (!activeOrgId) return;

      const memSnap = await getDocs(collection(db, "organisations", activeOrgId, "memberships"));
      
      const batch = writeBatch(db);
      let count = 0;

      memSnap.forEach((memDoc) => {
        const orgEntry = memDoc.data() as OrgMembership;
        const userId = memDoc.id;

        let changed = false;
        const updatePayload: Partial<OrgMembership> = {};

        if (teamId) {
          if (orgEntry.teams?.includes(teamId) || (teamName && orgEntry.teams?.includes(teamName))) {
            updatePayload.teams = orgEntry.teams.filter((id) => id !== teamId && id !== teamName);
            changed = true;
          }

          if (orgEntry.teamPositions) {
            const newTeamPositions = { ...orgEntry.teamPositions };
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
              updatePayload.teamPositions = newTeamPositions;
              updatePayload.indexedAssignments = generateIndexedAssignments(newTeamPositions);
              changed = true;
            }
          }
        }

        if (positionId) {
          if (orgEntry.teamPositions) {
            let posChanged = false;
            const newTeamPositions: Record<string, string[]> = {};

            Object.entries(orgEntry.teamPositions).forEach(([tId, posIds]) => {
              if (Array.isArray(posIds) && posIds.includes(positionId)) {
                newTeamPositions[tId] = posIds.filter((id) => id !== positionId);
                posChanged = true;
              } else {
                newTeamPositions[tId] = posIds as string[];
              }
            });

            if (posChanged) {
              updatePayload.teamPositions = newTeamPositions;
              updatePayload.indexedAssignments = generateIndexedAssignments(newTeamPositions);
              changed = true;
            }
          }
        }

        if (changed) {
          batch.update(doc(db, "organisations", activeOrgId, "memberships", userId), updatePayload);
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
        (user as Record<string, unknown>)[field] = value;
      }
    },
    updateUserOrgField(
      state,
      action: PayloadAction<{
        userId: string;
        orgId: string;
        field: keyof OrgMembership;
        value: boolean;
      }>,
    ) {
      const { userId, orgId, field, value } = action.payload;
      const user = state.allUsers.find((u) => u.id === userId);
      if (user) {
        let orgs = user.organisations as unknown as Record<string, OrgMembership>;
        if (!orgs || Array.isArray(orgs)) {
           // TODO: Cleanup - After organisations root Map is removed, remove this transition case
           orgs = {};
           (user as Record<string, unknown>).organisations = orgs;
        }
        
        if (!orgs[orgId]) {
          orgs[orgId] = { 
            isActive: true, 
            isAdmin: false, 
            isApproved: false,
            teams: [],
            teamPositions: {},
            indexedAssignments: []
          };
        }
        const membership = orgs[orgId];
        (membership as unknown as Record<string, unknown>)[field] = value;
      }
    },
    toggleUserTeam(
      state,
      action: PayloadAction<{ userId: string; orgId: string; teamName: string }>,
    ) {
      const { userId, orgId, teamName } = action.payload;
      const user = state.allUsers.find((u) => u.id === userId);
      if (user) {
        const orgs = user.organisations as unknown as Record<string, OrgMembership>;
        if (orgs?.[orgId]) {
          const org = orgs[orgId];
          const currentTeams = org.teams || [];
          const newTeams = currentTeams.includes(teamName)
            ? currentTeams.filter((t: string) => t !== teamName)
            : [...currentTeams, teamName];
          org.teams = newTeams;

          if (!org.teamPositions) org.teamPositions = {};
          if (newTeams.includes(teamName)) {
            if (!org.teamPositions[teamName]) org.teamPositions[teamName] = [];
          } else {
            delete org.teamPositions[teamName];
          }
          org.indexedAssignments = generateIndexedAssignments(org.teamPositions);
        }
      }
    },
    toggleUserTeamPosition(
      state,
      action: PayloadAction<{
        userId: string;
        orgId: string;
        teamName: string;
        posName: string;
      }>,
    ) {
      const { userId, orgId, teamName, posName } = action.payload;
      const user = state.allUsers.find((u) => u.id === userId);
      if (user) {
        const orgs = user.organisations as unknown as Record<string, OrgMembership>;
        if (orgs?.[orgId]) {
          const org = orgs[orgId];
          if (!org.teamPositions) org.teamPositions = {};
          if (!org.teamPositions[teamName]) org.teamPositions[teamName] = [];

          const currentPos = org.teamPositions[teamName];
          const newPos = currentPos.includes(posName)
            ? currentPos.filter((p: string) => p !== posName)
            : [...currentPos, posName];
          org.teamPositions[teamName] = newPos;
          org.indexedAssignments = generateIndexedAssignments(org.teamPositions);
        }
      }
    },
    reorderUserTeams(
      state,
      action: PayloadAction<{
        userId: string;
        orgId: string;
        newOrder: string[];
      }>,
    ) {
      const { userId, orgId, newOrder } = action.payload;
      const user = state.allUsers.find((u) => u.id === userId);
      if (user) {
        const orgs = user.organisations as unknown as Record<string, OrgMembership>;
        if (orgs?.[orgId]) {
          orgs[orgId].teams = newOrder;
        }
      }
    },
    resetUserChanges(state) {
      state.allUsers = JSON.parse(JSON.stringify(state.originalUsers));
    },
    setAllUsers(state, action: PayloadAction<AppUserWithId[]>) {
      state.allUsers = action.payload;
      state.originalUsers = JSON.parse(JSON.stringify(action.payload));
      state.loading = false;
    },
    setAllMemberships(state, action: PayloadAction<Record<string, OrgMembership>>) {
      state.memberships = action.payload;
    },
    setAllUserProfiles(state, action: PayloadAction<Record<string, AppUser>>) {
      state.profiles = action.payload;
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
  updateUserOrgField,
  toggleUserTeam,
  toggleUserTeamPosition,
  reorderUserTeams,
  resetUserChanges,
  setAllUsers,
  setAllMemberships,
  setAllUserProfiles,
} = userManagementSlice.actions;
export const userManagementReducer = userManagementSlice.reducer;
