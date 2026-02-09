import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { db } from '../../firebase';
import { Position } from '../../model/model';

interface PositionsState {
  positions: Position[];
  loading: boolean;
  error: string | null;
  fetched: boolean;
}

const initialState: PositionsState = {
  positions: [],
  loading: false,
  error: null,
  fetched: false,
};

export const fetchPositions = createAsyncThunk(
  'positions/fetchPositions',
  async (_, { rejectWithValue }) => {
    try {
      const docRef = doc(db, 'metadata', 'positions');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        return Array.isArray(data.list) ? data.list : [];
      }
      return [];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch positions',
      );
    }
  },
);

export const updatePositions = createAsyncThunk(
  'positions/updatePositions',
  async (positions: Position[], { rejectWithValue }) => {
    try {
      const docRef = doc(db, 'metadata', 'positions');
      await updateDoc(docRef, { list: positions });
      return positions;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to update positions',
      );
    }
  },
);

const positionsSlice = createSlice({
  name: 'positions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPositions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPositions.fulfilled, (state, action) => {
        state.positions = action.payload;
        state.loading = false;
        state.fetched = true;
      })
      .addCase(fetchPositions.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      .addCase(updatePositions.fulfilled, (state, action) => {
        state.positions = action.payload;
      });
  },
});

export const positionsReducer = positionsSlice.reducer;