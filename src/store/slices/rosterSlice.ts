import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  collection,
  query,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../../firebase';
import { RosterEntry } from '../../model/model';

interface RosterState {
  entries: RosterEntry[];
  loading: boolean;
  error: string | null;
}

const initialState: RosterState = {
  entries: [],
  loading: false,
  error: null,
};

export const fetchRosterEntries = createAsyncThunk(
  'roster/fetchEntries',
  async (_, { rejectWithValue }) => {
    try {
      const q = query(collection(db, 'roster'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        ...(doc.data() as Omit<RosterEntry, 'id'>),
        id: doc.id,
      }));
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch roster entries',
      );
    }
  },
);

export const createRosterEntry = createAsyncThunk(
  'roster/createEntry',
  async (entry: Omit<RosterEntry, 'id'>, { rejectWithValue }) => {
    try {
      const docRef = doc(collection(db, 'roster'));
      await setDoc(docRef, entry);
      return { ...entry, id: docRef.id };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to create roster entry',
      );
    }
  },
);

export const updateRosterEntry = createAsyncThunk(
  'roster/updateEntry',
  async ({ id, data }: { id: string; data: Partial<RosterEntry>; }, { rejectWithValue }) => {
    try {
      const docRef = doc(db, 'roster', id);
      await updateDoc(docRef, data);
      return { id, ...data };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to update roster entry',
      );
    }
  },
);

export const deleteRosterEntry = createAsyncThunk(
  'roster/deleteEntry',
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteDoc(doc(db, 'roster', id));
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to delete roster entry',
      );
    }
  },
);

const rosterSlice = createSlice({
  name: 'roster',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRosterEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRosterEntries.fulfilled, (state, action) => {
        state.entries = action.payload;
        state.loading = false;
      })
      .addCase(fetchRosterEntries.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      .addCase(createRosterEntry.pending, (state) => {
        state.error = null;
      })
      .addCase(createRosterEntry.fulfilled, (state, action) => {
        state.entries.push(action.payload);
      })
      .addCase(createRosterEntry.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(updateRosterEntry.fulfilled, (state, action) => {
        const index = state.entries.findIndex((entry) => entry.id === action.payload.id);
        if (index !== -1) {
          state.entries[index] = { ...state.entries[index], ...action.payload };
        }
      })
      .addCase(updateRosterEntry.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteRosterEntry.fulfilled, (state, action) => {
        state.entries = state.entries.filter((entry) => entry.id !== action.payload);
      })
      .addCase(deleteRosterEntry.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = rosterSlice.actions;
export const rosterReducer = rosterSlice.reducer;
