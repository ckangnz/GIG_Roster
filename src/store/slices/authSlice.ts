import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs 
} from 'firebase/firestore';

import { db } from '../../firebase';
import i18n from '../../i18n/config';
import { AppUser, Organisation, generateIndexedAssignments } from '../../model/model';

interface AuthState {
  firebaseUser: User | null;
  userData: AppUser | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  firebaseUser: null,
  userData: null,
  loading: true,
  error: null,
};

export const initializeUserData = createAsyncThunk(
  'auth/initializeUserData',
  async (authUser: User | null, { rejectWithValue }) => {
    if (!authUser) return null;
    try {
      const userDocRef = doc(db, 'users', authUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const rawData = userSnap.data();
        let data = rawData as AppUser;
        
        // Migration logic: handle old structure
        const oldOrgId = rawData.orgId;
        if (oldOrgId && !data.organisations) {
          const isActive = rawData.isActive ?? true;
          const isAdmin = rawData.isAdmin ?? false;
          const isApproved = rawData.isApproved ?? false;
          
          const migratedData: Partial<AppUser> = {
            activeOrgId: oldOrgId,
            organisations: {
              [oldOrgId]: {
                isActive,
                isAdmin,
                isApproved
              }
            }
          };
          
          await updateDoc(userDocRef, migratedData);
          data = { ...data, ...migratedData };
        } else if (!data.organisations) {
          // No organisations at all
          const migratedData: Partial<AppUser> = {
            activeOrgId: null,
            organisations: {}
          };
          await updateDoc(userDocRef, migratedData);
          data = { ...data, ...migratedData };
        }

        if (data.preferredLanguage) {
          i18n.changeLanguage(data.preferredLanguage);
        }
        return data;
      } else {
        const newData: AppUser = {
          name: authUser?.displayName || null,
          email: authUser?.email || null,
          activeOrgId: null, // No fallback
          organisations: {},
          teams: [],
          teamPositions: {},
          indexedAssignments: [],
          gender: '',
        };
        await setDoc(userDocRef, newData);
        return newData;
      }
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to initialize user data',
      );
    }
  },
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (
    { uid, data }: { uid: string; data: Partial<AppUser> & { isActive?: boolean } },
    { rejectWithValue, getState },
  ) => {
    try {
      const state = getState() as { auth: AuthState };
      const activeOrgId = state.auth.userData?.activeOrgId;
      
      const userRef = doc(db, 'users', uid);
      const updatePayload: Record<string, unknown> = { ...data };

      if (updatePayload.teamPositions) {
        updatePayload.indexedAssignments = generateIndexedAssignments(updatePayload.teamPositions as Record<string, string[]>);
      }

      if (updatePayload.preferredLanguage) {
        i18n.changeLanguage(updatePayload.preferredLanguage as string);
      }

      // Handle isActive migration to nested structure
      if (activeOrgId && updatePayload.isActive !== undefined) {
        updatePayload[`organisations.${activeOrgId}.isActive`] = updatePayload.isActive;
        delete updatePayload.isActive;
      }

      await updateDoc(userRef, updatePayload);
      return data; // Return original data (with isActive at top level for easy slice merging)
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to update profile',
      );
    }
  },
);

export const searchOrganisations = createAsyncThunk(
  'auth/searchOrganisations',
  async (searchTerm: string, { rejectWithValue }) => {
    try {
      const q = collection(db, 'organisations');
      const snap = await getDocs(q);
      const results: Organisation[] = [];
      
      const term = searchTerm.toLowerCase();
      snap.forEach(doc => {
        const data = doc.data() as Organisation;
        if (data.name.toLowerCase().includes(term)) {
          results.push(data);
        }
      });
      
      return results;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Search failed');
    }
  }
);

export const joinOrganisation = createAsyncThunk(
  'auth/joinOrganisation',
  async ({ uid, orgId, profileData }: { uid: string; orgId: string; profileData: Partial<AppUser> }, { rejectWithValue }) => {
    try {
      const userRef = doc(db, 'users', uid);
      const update: Partial<AppUser> = {
        ...profileData,
        activeOrgId: orgId,
        organisations: {
          [orgId]: {
            isActive: true,
            isAdmin: false,
            isApproved: false // Must be approved by Org Admin
          }
        },
        // updatedAt: Date.now() // AppUser doesn't have updatedAt in interface but it's okay to add if needed, though model says it doesn't
      };

      if (update.preferredLanguage) {
        i18n.changeLanguage(update.preferredLanguage);
      }

      await updateDoc(userRef, update);
      return update;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Join failed');
    }
  }
);

export const leaveOrganisation = createAsyncThunk(
  'auth/leaveOrganisation',
  async ({ uid, orgId }: { uid: string; orgId: string }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthState };
      const currentOrganisations = { ...state.auth.userData?.organisations };
      delete currentOrganisations[orgId];
      
      const userRef = doc(db, 'users', uid);
      const update: Partial<AppUser> = {
        activeOrgId: null,
        organisations: currentOrganisations
      };

      await updateDoc(userRef, update);
      return update;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Leave failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.firebaseUser = action.payload;
    },
    setUserData: (state, action: PayloadAction<AppUser | null>) => {
      state.userData = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    logout: (state) => {
      state.firebaseUser = null;
      state.userData = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeUserData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeUserData.fulfilled, (state, action: PayloadAction<AppUser | null>) => {
        state.userData = action.payload;
        state.loading = false;
      })
      .addCase(initializeUserData.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      .addCase(updateUserProfile.pending, (state) => {
        state.error = null;
      })
      .addCase(
        updateUserProfile.fulfilled,
        (state, action: PayloadAction<Partial<AppUser> & { isActive?: boolean }>) => {
          if (state.userData) {
            const { isActive, ...otherData } = action.payload;
            state.userData = { ...state.userData, ...otherData };
            
            if (isActive !== undefined && state.userData.activeOrgId) {
              const activeOrgId = state.userData.activeOrgId;
              state.userData.organisations = {
                ...state.userData.organisations,
                [activeOrgId]: {
                  ...state.userData.organisations[activeOrgId],
                  isActive
                }
              };
            }
          }
        },
      )
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(joinOrganisation.fulfilled, (state, action: PayloadAction<Partial<AppUser>>) => {
        if (state.userData) {
          state.userData = { ...state.userData, ...action.payload };
        }
      })
      .addCase(leaveOrganisation.fulfilled, (state, action: PayloadAction<Partial<AppUser>>) => {
        if (state.userData) {
          state.userData = { ...state.userData, ...action.payload };
        }
      });
  },
});

export const { setUser, setUserData, setLoading, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;

export const selectUserData = (state: { auth: AuthState }) => {
  const { userData } = state.auth;
  if (!userData) return null;
  
  const activeOrgId = userData.activeOrgId;
  const orgMembership = activeOrgId ? userData.organisations[activeOrgId] : null;
  
  return {
    ...userData,
    orgId: activeOrgId, // for backward compatibility
    isAdmin: orgMembership?.isAdmin || false,
    isApproved: orgMembership?.isApproved || false,
    isActive: orgMembership?.isActive || false,
  };
};
