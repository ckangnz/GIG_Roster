import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  createSelector,
} from "@reduxjs/toolkit";
import { User } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../../firebase";
import i18n from "../../i18n/config";
import {
  AppUser,
  Organisation,
  OrgMembership,
  AppUserWithMembership,
  generateIndexedAssignments,
} from "../../model/model";

/** Resolves "system" to the best matching supported language from the browser */
const SUPPORTED_LANGUAGES = ["en-NZ", "ko"];
export const resolveLanguage = (lang: string): string => {
  if (lang !== "system") return lang;
  const browserLang = navigator.language;
  return SUPPORTED_LANGUAGES.find((l) => browserLang.startsWith(l.split("-")[0])) ?? "en-NZ";
};

export interface AuthState {
  firebaseUser: User | null;
  userData: AppUser | null;
  membership: OrgMembership | null; // Data for active org
  activeOrgId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  firebaseUser: null,
  userData: null,
  membership: null,
  activeOrgId: localStorage.getItem("activeOrgId"),
  loading: true,
  error: null,
};

export const initializeUserData = createAsyncThunk(
  "auth/initializeUserData",
  async (authUser: User | null, { rejectWithValue, dispatch }) => {
    if (!authUser) return null;
    try {
      const userDocRef = doc(db, "users", authUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as AppUser;

        // Load membership for active org if exists
        const activeOrgId = localStorage.getItem("activeOrgId");
        const orgs = data.organisations;
        const orgIds: string[] = Array.isArray(orgs) ? orgs : Object.keys(orgs);
        const hasOrg = activeOrgId ? orgIds.includes(activeOrgId) : false;

        if (activeOrgId && hasOrg) {
          const memRef = doc(
            db,
            "organisations",
            activeOrgId,
            "memberships",
            authUser.uid,
          );
          const memSnap = await getDoc(memRef);
          if (memSnap.exists()) {
            const memData = memSnap.data() as OrgMembership;
            dispatch(setMembership(memData));
            if (memData.preferredLanguage) {
              i18n.changeLanguage(resolveLanguage(memData.preferredLanguage));
            }
          }
        }

        return data;
      } else {
        const newData: AppUser = {
          name: authUser?.displayName || null,
          email: authUser?.email || null,
          organisations: [],
          gender: "",
        };
        await setDoc(userDocRef, newData);
        return newData;
      }
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to initialize user data",
      );
    }
  },
);

export const updateUserProfile = createAsyncThunk(
  "auth/updateUserProfile",
  async (
    {
      uid,
      data,
    }: {
      uid: string;
      data: Partial<AppUser> & {
        isActive?: boolean;
        teams?: string[];
        teamPositions?: Record<string, string[]>;
        preferredLanguage?: string;
      };
    },
    { rejectWithValue, getState },
  ) => {
    try {
      const state = getState() as { auth: AuthState };
      const activeOrgId = state.auth.activeOrgId;

      const userRef = doc(db, "users", uid);
      const globalUpdate: Record<string, unknown> = {};
      const membershipUpdate: Record<string, unknown> = {};

      // Global fields (users/{uid})
      if (data.name !== undefined) globalUpdate.name = data.name;
      if (data.gender !== undefined) globalUpdate.gender = data.gender;

      // Organisation-specific fields
      if (activeOrgId) {
        // Membership update (data)
        if (data.isActive !== undefined) membershipUpdate.isActive = data.isActive;
        if (data.teams !== undefined) membershipUpdate.teams = data.teams;
        if (data.teamPositions !== undefined) {
          membershipUpdate.teamPositions = data.teamPositions;
          membershipUpdate.indexedAssignments = generateIndexedAssignments(
            data.teamPositions,
          );
        }
        if (data.preferredLanguage !== undefined) {
          membershipUpdate.preferredLanguage = data.preferredLanguage;
          i18n.changeLanguage(resolveLanguage(data.preferredLanguage));
        }
      }

      const promises = [];
      if (Object.keys(globalUpdate).length > 0) {
        promises.push(updateDoc(userRef, globalUpdate));
      }
      if (activeOrgId && Object.keys(membershipUpdate).length > 0) {
        const memRef = doc(
          db,
          "organisations",
          activeOrgId,
          "memberships",
          uid,
        );
        promises.push(setDoc(memRef, membershipUpdate, { merge: true }));
      }

      await Promise.all(promises);
      return data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update profile",
      );
    }
  },
);

export const joinOrganisation = createAsyncThunk(
  "auth/joinOrganisation",
  async (
    {
      uid,
      orgId,
      profileData,
    }: {
      uid: string;
      orgId: string;
      profileData: Partial<AppUser> & { preferredLanguage?: string };
    },
    { rejectWithValue },
  ) => {
    try {
      // 1. Fetch org to check requiresApproval
      const orgRef = doc(db, "organisations", orgId);
      const orgSnap = await getDoc(orgRef);
      if (!orgSnap.exists()) {
        return rejectWithValue("Organisation not found");
      }
      const orgData = orgSnap.data() as Organisation;
      const isOwner = orgData.ownerId === uid;
      const requiresApproval = orgData.settings?.requireApproval ?? true;
      const isApproved = isOwner || !requiresApproval;
      const isAdmin = isOwner;

      // 2. Check user's current organisations
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return rejectWithValue("User not found");

      const userData = userSnap.data() as AppUser;
      const currentOrgs = userData.organisations || [];
      const currentOrgIds: string[] = Array.isArray(currentOrgs)
        ? currentOrgs
        : Object.keys(currentOrgs);

      const isOrgInUserDoc = currentOrgIds.includes(orgId);

      // 3. Check membership document
      const memRef = doc(db, "organisations", orgId, "memberships", uid);
      const memSnap = await getDoc(memRef);
      const isMembershipDocExists = memSnap.exists();

      // Case: Truly already a member
      if (isOrgInUserDoc && isMembershipDocExists) {
        return {
          orgId,
          profileData,
          membership: memSnap.data() as OrgMembership,
          alreadyMember: true,
        };
      }

      // Recovery / Join: Update user doc if org index is missing
      if (!isOrgInUserDoc) {
        await updateDoc(userRef, {
          organisations: [...currentOrgIds, orgId],
        });
      }

      // Prepare / update membership doc
      let membership: OrgMembership;
      if (isMembershipDocExists) {
        membership = memSnap.data() as OrgMembership;
        // Override stale data with fresh join logic
        membership.isActive = true;
        membership.isApproved = isApproved;
        membership.isAdmin = isAdmin;
      } else {
        membership = {
          isActive: true,
          isAdmin,
          isApproved,
          teams: [],
          teamPositions: {},
          indexedAssignments: [],
          preferredLanguage: profileData.preferredLanguage || "en-NZ",
        };
      }

      if (profileData.preferredLanguage) {
        membership.preferredLanguage = profileData.preferredLanguage;
        i18n.changeLanguage(resolveLanguage(profileData.preferredLanguage));
      }

      await setDoc(memRef, membership);
      return { orgId, profileData, membership, alreadyMember: false };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Join failed",
      );
    }
  },
);

export const leaveOrganisation = createAsyncThunk(
  "auth/leaveOrganisation",
  async (
    { uid, orgId }: { uid: string; orgId: string },
    { rejectWithValue },
  ) => {
    try {
      // 1. Remove from user's index
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      const currentOrgs = userSnap.exists()
        ? userSnap.data().organisations || []
        : [];

      // Migrate legacy map format to array, then filter out orgId
      const currentOrgIds: string[] = Array.isArray(currentOrgs)
        ? currentOrgs
        : Object.keys(currentOrgs);
      await updateDoc(userRef, {
        organisations: currentOrgIds.filter((id: string) => id !== orgId),
      });

      // 2. Delete membership document
      const memRef = doc(db, "organisations", orgId, "memberships", uid);
      await deleteDoc(memRef);

      return { orgId };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Leave failed",
      );
    }
  },
);

export const searchOrganisations = createAsyncThunk(
  "auth/searchOrganisations",
  async (searchTerm: string, { rejectWithValue }) => {
    try {
      const q = collection(db, "organisations");
      const snap = await getDocs(q);
      const results: Organisation[] = [];

      const term = searchTerm.toLowerCase();
      snap.forEach((doc) => {
        const data = doc.data() as Organisation;
        // Only include public organisations in search results
        if (data.visibility === "public" && data.name.toLowerCase().includes(term)) {
          results.push(data);
        }
      });

      return results;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Search failed",
      );
    }
  },
);

export const createOrganisation = createAsyncThunk(
  "auth/createOrganisation",
  async (
    {
      uid,
      name,
      visibility,
      plan,
      requireApproval,
      profileData,
    }: {
      uid: string;
      name: string;
      visibility: "public" | "private";
      plan: "free" | "pro" | "enterprise";
      requireApproval: boolean;
      profileData: Partial<AppUser> & { preferredLanguage?: string };
    },
    { rejectWithValue },
  ) => {
    try {
      const orgRef = doc(collection(db, "organisations"));
      const orgId = orgRef.id;
      const now = Date.now();

      // 1. Create Organisation Document
      const orgData: Organisation = {
        id: orgId,
        name,
        ownerId: uid,
        createdAt: now,
        visibility,
        subscription: {
          plan,
          // Trial ends in 1 month
          expiresAt: new Date(now).setMonth(new Date(now).getMonth() + 1),
        },
        settings: {
          requireApproval,
        },
      };
      await setDoc(orgRef, orgData);

      // 2. Create Membership Document (Creator is Admin & Approved)
      const memRef = doc(db, "organisations", orgId, "memberships", uid);
      const membership: OrgMembership = {
        isActive: true,
        isAdmin: true,
        isApproved: true,
        teams: [],
        teamPositions: {},
        indexedAssignments: [],
        preferredLanguage: profileData.preferredLanguage || "en-NZ",
      };
      await setDoc(memRef, membership);

      // 3. Update User Document
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      const currentOrgs = userSnap.exists()
        ? userSnap.data().organisations || []
        : [];

      // Migrate legacy map format to array
      const currentOrgIds: string[] = Array.isArray(currentOrgs)
        ? currentOrgs
        : Object.keys(currentOrgs);

      const newOrgIds = currentOrgIds.includes(orgId)
        ? currentOrgIds
        : [...currentOrgIds, orgId];

      const userUpdate: Record<string, unknown> = {
        ...profileData,
        organisations: newOrgIds,
      };
      await updateDoc(userRef, userUpdate);

      return { orgId, orgData, membership };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to create organisation",
      );
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.firebaseUser = action.payload;
    },
    setUserData: (state, action: PayloadAction<AppUser | null>) => {
      state.userData = action.payload;
    },
    setMembership: (state, action: PayloadAction<OrgMembership | null>) => {
      state.membership = action.payload;
    },
    setActiveOrgId: (state, action: PayloadAction<string | null>) => {
      state.activeOrgId = action.payload;
      if (action.payload) {
        localStorage.setItem("activeOrgId", action.payload);
      } else {
        localStorage.removeItem("activeOrgId");
      }
    },
    clearActiveOrgId: (state) => {
      state.activeOrgId = null;
      localStorage.removeItem("activeOrgId");
      state.membership = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    logout: (state) => {
      state.firebaseUser = null;
      state.userData = null;
      state.membership = null;
      state.activeOrgId = null;
      state.loading = false;
      localStorage.removeItem("activeOrgId");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeUserData.pending, (state, action) => {
        // Only set loading if called with a real user (not null)
        if (action.meta.arg !== null) {
          state.loading = true;
          state.error = null;
        }
      })
      .addCase(
        initializeUserData.fulfilled,
        (state, action: PayloadAction<AppUser | null>) => {
          state.userData = action.payload;
          state.loading = false;
        },
      )
      .addCase(initializeUserData.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        if (state.userData) {
          const {
            isActive,
            teams,
            teamPositions,
            preferredLanguage,
            ...globalData
          } = action.payload;
          state.userData = { ...state.userData, ...globalData };

          if (state.membership) {
            state.membership = {
              ...state.membership,
              ...(isActive !== undefined && { isActive }),
              ...(teams !== undefined && { teams }),
              ...(preferredLanguage !== undefined && { preferredLanguage }),
              ...(teamPositions !== undefined && {
                teamPositions,
                indexedAssignments: generateIndexedAssignments(teamPositions),
              }),
            };
          }
        }
      })
      .addCase(joinOrganisation.fulfilled, (state, action) => {
        if (state.userData && !action.payload.alreadyMember) {
          const { orgId } = action.payload;
          const orgs = state.userData.organisations;
          // Always keep as array, migrate legacy map if needed
          const orgIds: string[] = Array.isArray(orgs) ? orgs : Object.keys(orgs);
          if (!orgIds.includes(orgId)) {
            state.userData.organisations = [...orgIds, orgId];
          } else {
            state.userData.organisations = orgIds;
          }
        }
        // Only update membership if the joined org is the active one
        // (don't overwrite active org's membership when joining a second org)
        if (action.payload.orgId === state.activeOrgId) {
          state.membership = action.payload.membership;
        }
      })
      .addCase(leaveOrganisation.fulfilled, (state, action) => {
        if (state.userData) {
          const orgs = state.userData.organisations;
          const orgIds: string[] = Array.isArray(orgs) ? orgs : Object.keys(orgs);
          state.userData.organisations = orgIds.filter(
            (id: string) => id !== action.payload.orgId,
          );
        }
        if (state.activeOrgId === action.payload.orgId) {
          state.activeOrgId = null;
          state.membership = null;
        }
      })
      .addCase(createOrganisation.fulfilled, (state, action) => {
        if (state.userData) {
          const orgs = state.userData.organisations;
          // Always keep as array, migrate legacy map if needed
          const orgIds: string[] = Array.isArray(orgs) ? orgs : Object.keys(orgs);
          const orgId = action.payload.orgId;
          state.userData.organisations = orgIds.includes(orgId)
            ? orgIds
            : [...orgIds, orgId];
        }
        state.activeOrgId = action.payload.orgId;
        state.membership = action.payload.membership;
        localStorage.setItem("activeOrgId", action.payload.orgId);
      });
  },
});

export const {
  setUser,
  setUserData,
  setMembership,
  setActiveOrgId,
  clearActiveOrgId,
  setLoading,
  logout,
} = authSlice.actions;
export const authReducer = authSlice.reducer;

export const selectUserData = createSelector(
  [
    (state: { auth: AuthState }) => state.auth.userData,
    (state: { auth: AuthState }) => state.auth.activeOrgId,
    (state: { auth: AuthState }) => state.auth.membership,
  ],
  (userData, activeOrgId, membership): AppUserWithMembership | null => {
    if (!userData) return null;

    // Normalise legacy map format to string array
    const rawOrgs = userData.organisations;
    const organisationIds: string[] = Array.isArray(rawOrgs)
      ? rawOrgs
      : Object.keys(rawOrgs || {});

    return {
      ...userData,
      activeOrgId,
      orgId: activeOrgId,
      organisations: organisationIds,
      isAdmin: membership?.isAdmin ?? false,
      isApproved: membership?.isApproved ?? false,
      isActive: membership?.isActive ?? true,

      teams: membership?.teams || [],
      teamPositions: membership?.teamPositions || {},
      indexedAssignments: membership?.indexedAssignments || [],
      preferredLanguage: membership?.preferredLanguage || "en-NZ",
    };
  },
);
