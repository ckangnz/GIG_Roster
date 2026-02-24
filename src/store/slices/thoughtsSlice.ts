import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";

import { db } from "../../firebase";
import { Thought, ThoughtEntry } from "../../model/model";

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

/**
 * Normalizes a Thought object to ensure it has an entries array,
 * handling legacy 'text' and 'hearts' fields.
 */
export const normalizeThought = (thought: Thought): Thought => {
  if (thought.entries && Array.isArray(thought.entries)) {
    return thought;
  }

  const entries: ThoughtEntry[] = [];
  if (thought.text) {
    entries.push({
      id: "legacy",
      text: thought.text,
      hearts: thought.hearts || {},
      updatedAt: thought.updatedAt,
    });
  }

  return {
    ...thought,
    entries,
  };
};

export const syncThoughtEntriesRemote = createAsyncThunk(
  "thoughts/syncThoughtEntriesRemote",
  async (
    payload: {
      userUid: string;
      teamName: string;
      userName: string;
      entries: ThoughtEntry[];
    },
    { rejectWithValue }
  ) => {
    const { userUid, teamName, userName, entries } = payload;
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
          entries,
          updatedAt: serverTimestamp(),
          // Clear legacy fields when updating to new format
          text: deleteField(),
          hearts: deleteField(),
        },
        { merge: true }
      );
      return { id };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to sync thoughts"
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

export const syncHeartEntryRemote = createAsyncThunk(
  "thoughts/syncHeartEntryRemote",
  async (
    payload: {
      thoughtId: string;
      entryId: string;
      userUid: string;
      updatedEntries: ThoughtEntry[];
    },
    { rejectWithValue }
  ) => {
    const { thoughtId, updatedEntries } = payload;
    try {
      const docRef = doc(db, "thoughts", thoughtId);
      await updateDoc(docRef, {
        entries: updatedEntries,
        updatedAt: serverTimestamp(),
      });
      return { thoughtId };
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
      const normalized: Record<string, Thought> = {};
      Object.entries(action.payload).forEach(([id, thought]) => {
        normalized[id] = normalizeThought(thought);
      });
      state.thoughts = normalized;
      state.loading = false;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    applyOptimisticThoughts(
      state,
      action: PayloadAction<{ id: string; entries: ThoughtEntry[] }>
    ) {
      const { id, entries } = action.payload;
      if (state.thoughts[id]) {
        state.thoughts[id].entries = entries;
      }
    },
    applyOptimisticRemove(state, action: PayloadAction<{ id: string }>) {
      delete state.thoughts[action.payload.id];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncThoughtEntriesRemote.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(removeThoughtRemote.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(syncHeartEntryRemote.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setThoughts,
  setLoading,
  applyOptimisticThoughts,
  applyOptimisticRemove,
} = thoughtsSlice.actions;
export const thoughtsReducer = thoughtsSlice.reducer;
