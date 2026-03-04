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
  UserOrgMetadata,
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
        const hasOrg = Array.isArray(orgs)
          ? orgs.includes(activeOrgId || "")
          : activeOrgId && orgs
            ? !!orgs[activeOrgId]
            : false;

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
          organisations: {},
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
        // Root update (permissions)
        if (data.isActive !== undefined) {
          globalUpdate[`organisations.${activeOrgId}.isActive`] = data.isActive;
          membershipUpdate.isActive = data.isActive; // Keep consistent
        }

        // Membership update (data)
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
      const requiresApproval = orgData.settings?.requireApproval ?? true;
      const isApproved = !requiresApproval;

      // 2. Check if already a member
      const memRef = doc(db, "organisations", orgId, "memberships", uid);
      const existingMem = await getDoc(memRef);
      if (existingMem.exists()) {
        // Already a member — return existing membership
        return { orgId, profileData, membership: existingMem.data() as OrgMembership, alreadyMember: true };
      }

      // 3. Update user document to include org index
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      const currentOrgs = userSnap.exists()
        ? userSnap.data().organisations || []
        : [];

      const userUpdate: Record<string, unknown> = { ...profileData };
      if (Array.isArray(currentOrgs)) {
        if (!currentOrgs.includes(orgId)) {
          userUpdate.organisations = [...currentOrgs, orgId];
        }
      } else {
        userUpdate[`organisations.${orgId}`] = {
          isActive: true,
          isAdmin: false,
          isApproved,
        };
      }

      await updateDoc(userRef, userUpdate);

      // 4. Create membership document
      const membership: OrgMembership = {
        isActive: true,
        isAdmin: false,
        isApproved,
        teams: [],
        teamPositions: {},
        indexedAssignments: [],
        preferredLanguage: profileData.preferredLanguage || "en-NZ",
      };

      if (profileData.preferredLanguage) {
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

      if (Array.isArray(currentOrgs)) {
        await updateDoc(userRef, {
          organisations: currentOrgs.filter((id: string) => id !== orgId),
        });
      } else {
        // Map structure (transition)
        const nextOrgs = { ...currentOrgs };
        delete nextOrgs[orgId];
        await updateDoc(userRef, {
          organisations: nextOrgs
        });
      }

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

      const userUpdate: Record<string, unknown> = {
        ...profileData,
        organisations: Array.isArray(currentOrgs)
          ? [...currentOrgs, orgId]
          : {
              ...currentOrgs,
              [orgId]: { isActive: true, isAdmin: true, isApproved: true },
            },
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
          const { orgId, membership } = action.payload;
          const orgs = state.userData.organisations;
          if (Array.isArray(orgs)) {
            if (!orgs.includes(orgId)) {
              state.userData.organisations = [...orgs, orgId];
            }
          } else {
            state.userData.organisations = {
              ...orgs,
              [orgId]: {
                isActive: true,
                isAdmin: false,
                isApproved: membership.isApproved,
              },
            };
          }
        }
        // Always update membership in state
        state.membership = action.payload.membership;
      })
      .addCase(leaveOrganisation.fulfilled, (state, action) => {
        if (state.userData) {
          const orgs = state.userData.organisations;
          if (Array.isArray(orgs)) {
            state.userData.organisations = orgs.filter(
              (id: string) => id !== action.payload.orgId,
            );
          } else {
            const nextOrgs = { ...orgs };
            delete nextOrgs[action.payload.orgId];
            state.userData.organisations = nextOrgs;
          }
        }
        if (state.activeOrgId === action.payload.orgId) {
          state.activeOrgId = null;
          state.membership = null;
        }
      })
      .addCase(createOrganisation.fulfilled, (state, action) => {
        if (state.userData) {
          const orgs = state.userData.organisations;
          if (Array.isArray(orgs)) {
            state.userData.organisations = [...orgs, action.payload.orgId];
          } else {
            state.userData.organisations = {
              ...orgs,
              [action.payload.orgId]: {
                isActive: true,
                isAdmin: true,
                isApproved: true,
              },
            };
          }
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

    // Get permissions from Root User Document if it's a Map (Fast path during migration)
    const orgs = userData.organisations;
    const isMap = orgs && !Array.isArray(orgs);
    const rootOrgData =
      isMap && activeOrgId
        ? (orgs as Record<string, UserOrgMetadata>)[activeOrgId]
        : null;

    // TODO: Cleanup - After organisations root Map is removed, remove this conversion
    // For UI compatibility, convert Array to virtual Map if needed
    let organisations = userData.organisations;
    if (Array.isArray(organisations)) {
      const virtualMap: Record<string, UserOrgMetadata> = {};
      organisations.forEach((id) => {
        virtualMap[id] = {
          isActive: id === activeOrgId ? (membership?.isActive ?? true) : true,
          isAdmin: id === activeOrgId ? (membership?.isAdmin ?? false) : false,
          isApproved:
            id === activeOrgId ? (membership?.isApproved ?? false) : true,
        };
      });
      organisations = virtualMap;
    }

    return {
      ...userData,
      activeOrgId,
      orgId: activeOrgId,
      organisations, // Now guaranteed to be a Map for the UI
      // Merge: Root map takes precedence if it exists, otherwise use membership sub-collection
      isAdmin: rootOrgData?.isAdmin ?? membership?.isAdmin ?? false,
      isApproved: rootOrgData?.isApproved ?? membership?.isApproved ?? false,
      isActive: rootOrgData?.isActive ?? membership?.isActive ?? true,

      teams: membership?.teams || [],
      teamPositions: membership?.teamPositions || {},
      indexedAssignments: membership?.indexedAssignments || [],
      preferredLanguage: membership?.preferredLanguage || "en-NZ",
    };
  },
);
