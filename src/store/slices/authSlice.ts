import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import { auth, db } from '../../firebase';
import { AppUser, generateIndexedAssignments } from '../../model/model';

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
  async (uid: string, { rejectWithValue }) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
        const authUser = auth.currentUser;
        const isAutoAdmin = authUser?.email === adminEmail;

        const newData: AppUser = {
          name: authUser?.displayName || null,
          email: authUser?.email || null,
          isApproved: isAutoAdmin,
          isAdmin: isAutoAdmin,
          isActive: true,
          teams: [],
          teamPositions: {},
          indexedAssignments: [],
          gender: '',
        };
        await setDoc(userRef, newData);
        return newData;
      }
      return userSnap.data() as AppUser;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Unknown error',
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
      .addCase(initializeUserData.fulfilled, (state, action: PayloadAction<AppUser>) => {
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
      });
  },
});

export const { setUser, setUserData, setLoading, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
