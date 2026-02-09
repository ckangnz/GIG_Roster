import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { auth, db } from '../../firebase';
import { AppUser } from '../../model/model';

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
          positions: [],
          gender: '',
        };
        await setDoc(userRef, newData);
        return newData;
      }
      return userSnap.data() as AppUser;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.firebaseUser = action.payload;
    },
    setUserData: (state, action) => {
      state.userData = action.payload;
    },
    setLoading: (state, action) => {
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
      .addCase(initializeUserData.fulfilled, (state, action) => {
        state.userData = action.payload;
        state.loading = false;
      })
      .addCase(initializeUserData.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      });
  },
});

export const { setUser, setUserData, setLoading, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
