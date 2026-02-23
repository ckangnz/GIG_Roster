import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../firebase";
import { Thought } from "../../model/model";

interface ThoughtsState {
  thoughts: Record<string, Thought>; // id ({userUid}_{teamName}) -> Thought
  loading: boolean;
  error: string | null;
}

const initialState: ThoughtsState = {
  thoughts: {},
  loading: false,
  error: null,
};

export const syncThoughtRemote = createAsyncThunk(
  "thoughts/syncThoughtRemote",
  async (
    payload: {
      userUid: string;
      teamName: string;
      userName: string;
      text: string;
    },
    { rejectWithValue }
  ) => {
    const { userUid, teamName, userName, text } = payload;
    const id = `${userUid}_${teamName}`;

    try {
      const docRef = doc(db, "thoughts", id);
      await setDoc(
        docRef,
        {
          id,
          userUid,
          teamName,
          userName,
          text,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return { id };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to sync thought"
      );
    }
  }
);

export const removeThoughtRemote = createAsyncThunk(
  "thoughts/removeThoughtRemote",
  async (payload: { id: string }, { rejectWithValue }) => {
    try {
      const docRef = doc(db, "thoughts", payload.id);
      await deleteDoc(docRef);
      return { id: payload.id };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to remove thought"
      );
    }
  }
);

export const syncHeartRemote = createAsyncThunk(
  "thoughts/syncHeartRemote",
  async (
    payload: {
      thoughtId: string;
      userUid: string;
    },
    { rejectWithValue }
  ) => {
    const { thoughtId, userUid } = payload;
    try {
      const docRef = doc(db, "thoughts", thoughtId);
      await updateDoc(docRef, {
        [`hearts.${userUid}`]: Date.now(),
        updatedAt: serverTimestamp(),
      });
      return { thoughtId, userUid };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to sync heart"
      );
    }
  }
);

const thoughtsSlice = createSlice({
  name: "thoughts",
  initialState,
  reducers: {
    setThoughts(state, action: PayloadAction<Record<string, Thought>>) {
      state.thoughts = action.payload;
      state.loading = false;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    applyOptimisticThought(state, action: PayloadAction<Thought>) {
      state.thoughts[action.payload.id] = action.payload;
    },
    applyOptimisticRemove(state, action: PayloadAction<{ id: string }>) {
      delete state.thoughts[action.payload.id];
    },
    applyOptimisticHeart(
      state,
      action: PayloadAction<{ thoughtId: string; userUid: string }>
    ) {
      const { thoughtId, userUid } = action.payload;
      if (state.thoughts[thoughtId]) {
        if (!state.thoughts[thoughtId].hearts) {
          state.thoughts[thoughtId].hearts = {};
        }
        state.thoughts[thoughtId].hearts[userUid] = Date.now();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncThoughtRemote.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(removeThoughtRemote.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(syncHeartRemote.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setThoughts,
  setLoading,
  applyOptimisticThought,
  applyOptimisticRemove,
  applyOptimisticHeart,
} = thoughtsSlice.actions;
export const thoughtsReducer = thoughtsSlice.reducer;
