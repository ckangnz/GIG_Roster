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
import { Thought, ThoughtEntry, AppUser } from "../../model/model";

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

const THOUGHT_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Safely converts any potential timestamp format to a numeric millisecond value.
 */
interface FirebaseTimestamp {
  toMillis: () => number;
  seconds: number;
}

const ensureTimestamp = (ts: unknown): number => {
  if (!ts) return 0;
  if (typeof ts === "number") return ts;
  if (typeof ts === "object" && ts !== null) {
    const fts = ts as Partial<FirebaseTimestamp>;
    if (typeof fts.toMillis === "function") return fts.toMillis();
    if (typeof fts.seconds === "number") return fts.seconds * 1000;
  }
  if (typeof ts === "string" || ts instanceof Date) {
    const parsed = new Date(ts as string | Date).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * LEGACY REMOVAL GUIDE (Post-March 2026):
 * Once all thoughts have migrated to the 'entries' format (which happens 
 * automatically within 1 week of user activity):
 * 
 * 1. In normalizeThought: Remove the 'else if (thought.text)' block.
 * 2. In normalizeThought: Simplify to: return { ...thought, entries: thought.entries || [] };
 * 3. In syncThoughtEntriesRemote: Remove the 'text: deleteField()' and 'hearts: deleteField()' lines.
 * 4. In model.ts: Remove 'text' and 'hearts' from the Thought interface.
 */
export const normalizeThought = (thought: Thought): Thought => {
  const now = Date.now();
  let entries: ThoughtEntry[] = [];

  if (thought.entries && Array.isArray(thought.entries)) {
    entries = thought.entries.map((e) => {
      const updatedAt = ensureTimestamp(e.updatedAt);
      return {
        ...e,
        updatedAt,
        isExpired: now - updatedAt >= THOUGHT_EXPIRATION_MS,
      };
    });
  } else if (thought.text) {
    // Legacy support
    const legacyUpdatedAt = ensureTimestamp(thought.updatedAt);
    entries.push({
      id: "legacy",
      text: thought.text,
      hearts: thought.hearts || {},
      updatedAt: legacyUpdatedAt,
      isExpired: now - legacyUpdatedAt >= THOUGHT_EXPIRATION_MS,
    });
  }

  // Create a clean copy without legacy fields
  const { text, hearts, ...cleanThought } = thought;
  void text;
  void hearts;

  return {
    ...cleanThought,
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
    { rejectWithValue, getState }
  ) => {
    const { userUid, teamName, userName, entries } = payload;
    const id = `${userUid}_${teamName}`;

    try {
      const state = getState() as { auth: { userData: AppUser | null } };
      const orgId = state.auth.userData?.orgId;
      if (!orgId) throw new Error("Org ID missing");

      const docRef = doc(db, "organisations", orgId, "thoughts", id);
      
      // Strip isExpired for Firebase
      const cleanEntries = entries.map(({ isExpired, ...rest }) => {
        void isExpired;
        return rest;
      });

      await setDoc(
        docRef,
        {
          id,
          orgId,
          userUid,
          teamName,
          userName,
          entries: cleanEntries,
          updatedAt: serverTimestamp(),
          // LEGACY REMOVAL: Remove these two lines after March 2026
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
  async (payload: { id: string }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { userData: AppUser | null } };
      const orgId = state.auth.userData?.orgId;
      if (!orgId) throw new Error("Org ID missing");

      const docRef = doc(db, "organisations", orgId, "thoughts", payload.id);
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
    { rejectWithValue, getState }
  ) => {
    const { thoughtId, updatedEntries } = payload;
    try {
      const state = getState() as { auth: { userData: AppUser | null } };
      const orgId = state.auth.userData?.orgId;
      if (!orgId) throw new Error("Org ID missing");

      const docRef = doc(db, "organisations", orgId, "thoughts", thoughtId);
      
      const cleanEntries = updatedEntries.map(({ isExpired, ...rest }) => {
        void isExpired;
        return rest;
      });

      await updateDoc(docRef, {
        entries: cleanEntries,
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
