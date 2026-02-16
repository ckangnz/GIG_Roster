import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../../firebase';
import { Position } from '../../model/model';

interface PositionsState {
  positions: Position[];
  loading: boolean;
  error: string | null;
  fetched: boolean;
  isDirty: boolean;
}

const initialState: PositionsState = {
  positions: [],
  loading: false,
  error: null,
  fetched: false,
  isDirty: false,
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
      await setDoc(docRef, { list: positions });
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

  reducers: {

        updatePositionCustomLabels: (

          state,

          action: PayloadAction<{ positionName: string; labels: string[] }>,

        ) => {

          const { positionName, labels } = action.payload;

          const pos = state.positions.find((p) => p.name === positionName);

          if (pos) {

            pos.customLabels = labels;

            state.isDirty = true;

          }

        },

        resetPositionsDirty: (state) => {

          state.isDirty = false;

        },

      },

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

              state.isDirty = false;

            });

        },

      });

      

      export const { updatePositionCustomLabels, resetPositionsDirty } =

        positionsSlice.actions;

      export const positionsReducer = positionsSlice.reducer;
