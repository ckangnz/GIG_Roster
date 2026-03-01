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
        return userSnap.data() as AppUser;
      } else {
        const isAutoAdmin = authUser.email === 'cksdud12345@gmail.com';
        const newData: AppUser = {
          name: authUser?.displayName || null,
          email: authUser?.email || null,
          orgId: null, // No fallback
          isApproved: isAutoAdmin,
          isAdmin: isAutoAdmin,
          isActive: true,
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
    { uid, data }: { uid: string; data: Partial<AppUser> },
    { rejectWithValue },
  ) => {
    try {
      const userRef = doc(db, 'users', uid);
      const finalData = { ...data };

      if (finalData.teamPositions) {
        finalData.indexedAssignments = generateIndexedAssignments(finalData.teamPositions);
      }

      await updateDoc(userRef, finalData);
      return finalData;
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
      const update = {
        ...profileData,
        orgId,
        isApproved: false, // Must be approved by Org Admin
        updatedAt: Date.now()
      };
      await updateDoc(userRef, update);
      return update;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Join failed');
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
        (state, action: PayloadAction<Partial<AppUser>>) => {
          if (state.userData) {
            state.userData = { ...state.userData, ...action.payload };
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
      });
  },
});

export const { setUser, setUserData, setLoading, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
