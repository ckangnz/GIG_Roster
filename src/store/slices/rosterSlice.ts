import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  deleteField,
  FieldPath,
} from "firebase/firestore";

import { db } from "../../firebase";
import { RosterEntry } from "../../model/model";

interface RosterState {
  entries: Record<string, RosterEntry>; // date -> RosterEntry
  loading: boolean;
  initialLoad: boolean;
  syncing: Record<string, boolean>; // track which dates are currently syncing
  error: string | null;
}

const initialState: RosterState = {
  entries: {},
  loading: true,
  initialLoad: false,
  syncing: {},
  error: null,
};

export const fetchRosterEntries = createAsyncThunk(
  "roster/fetchEntries",
  async (_, { rejectWithValue }) => {
    try {
      const q = query(collection(db, "roster"));
      const snapshot = await getDocs(q);
      const entries: Record<string, RosterEntry> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const updatedAt = data.updatedAt;
        const serializableData = {
          ...data,
          updatedAt:
            updatedAt && typeof updatedAt === 'object' && 'toMillis' in updatedAt
              ? (updatedAt as { toMillis: () => number }).toMillis()
              : (updatedAt as number | undefined),
        };
        entries[doc.id] = { ...serializableData, id: doc.id } as RosterEntry;
      });
      return entries;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch roster entries",
      );
    }
  },
);

export const syncAssignmentRemote = createAsyncThunk(
  "roster/syncAssignmentRemote",
  async (
    payload: {
      date: string;
      teamName: string;
      userIdentifier: string;
      updatedAssignments: string[];
    },
    { rejectWithValue }
  ) => {
    const { date, teamName, userIdentifier, updatedAssignments } = payload;

    try {
      const docRef = doc(db, "roster", date);
      const isRemoving = updatedAssignments.length === 0;
      const value = isRemoving ? deleteField() : updatedAssignments;

      await updateDoc(
        docRef, 
        new FieldPath("teams", teamName, userIdentifier), value,
        new FieldPath("updatedAt"), serverTimestamp()
      );
      
      return { date };
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'not-found') {
        const newEntry: RosterEntry = {
          id: date,
          date,
          teams: { [teamName]: { [userIdentifier]: updatedAssignments } },
          absence: {},
          updatedAt: Date.now(),
        };
        await setDoc(doc(db, "roster", date), { ...newEntry, updatedAt: serverTimestamp() });
        return { date };
      }
      return rejectWithValue(firebaseError.message || "Sync failed");
    }
  }
);

export const syncAbsenceRemote = createAsyncThunk(
  "roster/syncAbsenceRemote",
  async (
    payload: {
      date: string;
      userIdentifier: string;
      isAbsent: boolean;
      reason?: string;
      clearedTeams: string[]; 
      absentUserName?: string;
      clearedPositions?: Record<string, string[]>; // teamName -> positions[]
    },
    { rejectWithValue }
  ) => {
    const { date, userIdentifier, isAbsent, reason, clearedTeams, absentUserName, clearedPositions } = payload;

    try {
      const docRef = doc(db, "roster", date);
      const updates: (string | FieldPath | unknown)[] = [];
      updates.push(new FieldPath("updatedAt"), serverTimestamp());

      if (isAbsent) {
        updates.push(new FieldPath("absence", userIdentifier), { reason: reason || "" });
        
        // Clear team assignments
        clearedTeams.forEach(tName => {
          updates.push(new FieldPath("teams", tName, userIdentifier), deleteField());
        });

        // Create Coverage Requests for each cleared position
        if (clearedPositions) {
          Object.entries(clearedPositions).forEach(([tName, positions]) => {
            positions.forEach(posName => {
              const reqId = `${tName}_${posName}_${userIdentifier}`.replace(/\./g, '_');
              updates.push(new FieldPath("coverageRequests", reqId), {
                teamName: tName,
                positionName: posName,
                absentUserEmail: userIdentifier,
                absentUserName: absentUserName || userIdentifier,
                requestedAt: Date.now(),
                status: "open"
              });
            });
          });
        }
      } else {
        updates.push(new FieldPath("absence", userIdentifier), deleteField());
      }

      // @ts-expect-error - spread for variadic call
      await updateDoc(docRef, ...updates);
      return { date };
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'not-found' && isAbsent) {
        const newEntry: RosterEntry = {
          id: date,
          date,
          teams: {},
          absence: { [userIdentifier]: { reason: reason || "" } },
          updatedAt: Date.now(),
        };
        await setDoc(doc(db, "roster", date), { ...newEntry, updatedAt: serverTimestamp() });
        return { date };
      }
      return rejectWithValue(firebaseError.message || "Sync failed");
    }
  }
);

export const syncEventNameRemote = createAsyncThunk(
  "roster/syncEventNameRemote",
  async (payload: { date: string; eventName: string }, { rejectWithValue }) => {
    const { date, eventName } = payload;
    try {
      const docRef = doc(db, "roster", date);
      await updateDoc(docRef, { eventName, updatedAt: serverTimestamp() });
      return { date };
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'not-found') {
        const docRef = doc(db, "roster", date);
        const newEntry: RosterEntry = {
          id: date,
          date,
          teams: {},
          absence: {},
          eventName,
          updatedAt: Date.now(),
        };
        await setDoc(docRef, { ...newEntry, updatedAt: serverTimestamp() });
        return { date };
      }
      return rejectWithValue(firebaseError.message || "Sync failed");
    }
  }
);

export const resolveCoverageRequestRemote = createAsyncThunk(
  "roster/resolveCoverageRequest",
  async (
    payload: {
      date: string;
      requestId: string;
      status: "resolved" | "dismissed";
      resolvedByEmail?: string;
    },
    { rejectWithValue }
  ) => {
    const { date, requestId, status, resolvedByEmail } = payload;
    try {
      const docRef = doc(db, "roster", date);
      await updateDoc(docRef, {
        [`coverageRequests.${requestId}.status`]: status,
        [`coverageRequests.${requestId}.resolvedByEmail`]: resolvedByEmail || null,
        updatedAt: serverTimestamp(),
      });
      return { date, requestId, status, resolvedByEmail };
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : "Resolution failed");
    }
  }
);

const rosterSlice = createSlice({
  name: "roster",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setRosterEntries(state, action: PayloadAction<Record<string, RosterEntry>>) {
      state.entries = action.payload;
      state.loading = false;
      state.initialLoad = true;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    // Pure optimistic updates - now they just take the target state
    applyOptimisticAssignment(state, action: PayloadAction<{
      date: string;
      teamName: string;
      userIdentifier: string;
      updatedAssignments: string[];
    }>) {
      const { date, teamName, userIdentifier, updatedAssignments } = action.payload;
      if (!state.entries[date]) {
        state.entries[date] = { id: date, date, teams: {}, absence: {} };
      }
      const entry = state.entries[date];
      if (!entry.teams[teamName]) entry.teams[teamName] = {};
      
      if (updatedAssignments.length === 0) {
        delete entry.teams[teamName][userIdentifier];
      } else {
        entry.teams[teamName][userIdentifier] = updatedAssignments;
      }
    },
    applyOptimisticAbsence(state, action: PayloadAction<{
      date: string;
      userIdentifier: string;
      isAbsent: boolean;
      reason?: string;
      clearedPositions?: Record<string, string[]>;
      userName?: string;
    }>) {
      const { date, userIdentifier, isAbsent, reason, clearedPositions, userName } = action.payload;
      if (!state.entries[date]) {
        state.entries[date] = { id: date, date, teams: {}, absence: {} };
      }
      const entry = state.entries[date];
      if (isAbsent) {
        entry.absence[userIdentifier] = { reason: reason || "" };
        Object.keys(entry.teams).forEach(tName => {
          delete entry.teams[tName][userIdentifier];
        });

        // Optimistically create coverage requests
        if (clearedPositions) {
          if (!entry.coverageRequests) entry.coverageRequests = {};
          Object.entries(clearedPositions).forEach(([tName, positions]) => {
            positions.forEach(posName => {
              const reqId = `${tName}_${posName}_${userIdentifier}`.replace(/\./g, '_');
              entry.coverageRequests![reqId] = {
                teamName: tName,
                positionName: posName,
                absentUserEmail: userIdentifier,
                absentUserName: userName || userIdentifier,
                requestedAt: Date.now(),
                status: "open"
              };
            });
          });
        }
      } else {
        delete entry.absence[userIdentifier];
      }
    },
    applyOptimisticEventName(state, action: PayloadAction<{ date: string; eventName: string }>) {
      const { date, eventName } = action.payload;
      if (!state.entries[date]) {
        state.entries[date] = { id: date, date, teams: {}, absence: {} };
      }
      state.entries[date].eventName = eventName;
    },
    applyOptimisticResolve(state, action: PayloadAction<{
      date: string;
      requestId: string;
      status: "resolved" | "dismissed";
      resolvedByEmail?: string;
    }>) {
      const { date, requestId, status, resolvedByEmail } = action.payload;
      const entry = state.entries[date];
      if (entry?.coverageRequests?.[requestId]) {
        entry.coverageRequests[requestId].status = status;
        entry.coverageRequests[requestId].resolvedByEmail = resolvedByEmail;
      }
    }
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
      .addCase(syncAssignmentRemote.pending, (state, action) => {
        state.syncing[action.meta.arg.date] = true;
      })
      .addCase(syncAssignmentRemote.fulfilled, (state, action) => {
        state.syncing[action.payload.date] = false;
      })
      .addCase(syncAssignmentRemote.rejected, (state, action) => {
        state.error = action.payload as string;
        state.syncing[action.meta.arg.date] = false;
      })
      .addCase(syncAbsenceRemote.pending, (state, action) => {
        state.syncing[action.meta.arg.date] = true;
      })
      .addCase(syncAbsenceRemote.fulfilled, (state, action) => {
        state.syncing[action.payload.date] = false;
      })
      .addCase(syncAbsenceRemote.rejected, (state, action) => {
        state.error = action.payload as string;
        state.syncing[action.meta.arg.date] = false;
      })
      .addCase(syncEventNameRemote.pending, (state, action) => {
        state.syncing[action.meta.arg.date] = true;
      })
      .addCase(syncEventNameRemote.fulfilled, (state, action) => {
        state.syncing[action.payload.date] = false;
      })
      .addCase(syncEventNameRemote.rejected, (state, action) => {
        state.error = action.payload as string;
        state.syncing[action.meta.arg.date] = false;
      })
      .addCase(resolveCoverageRequestRemote.fulfilled, (state, action) => {
        const { date, requestId, status, resolvedByEmail } = action.payload;
        const entry = state.entries[date];
        if (entry?.coverageRequests?.[requestId]) {
          entry.coverageRequests[requestId].status = status;
          entry.coverageRequests[requestId].resolvedByEmail = resolvedByEmail;
        }
      });
  },
});

export const {
  clearError,
  setRosterEntries,
  setLoading,
  applyOptimisticAssignment,
  applyOptimisticAbsence,
  applyOptimisticEventName,
  applyOptimisticResolve,
} = rosterSlice.actions;
export const rosterReducer = rosterSlice.reducer;
