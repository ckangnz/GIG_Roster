import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  collection,
  query,
  getDocs,
  doc,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase";
import { RosterEntry } from "../../model/model";

interface RosterState {
  entries: Record<string, RosterEntry>; // date -> RosterEntry
  dirtyEntries: Record<string, RosterEntry>; // Staged changes
  loading: boolean;
  initialLoad: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: RosterState = {
  entries: {},
  dirtyEntries: {},
  loading: true,
  initialLoad: false,
  saving: false,
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

export const saveRosterChanges = createAsyncThunk(
  "roster/saveChanges",
  async (dirtyEntries: Record<string, RosterEntry>, { rejectWithValue }) => {
    try {
      const batch = writeBatch(db);
      const timestamp = Date.now();
      const entriesWithTimestamp: Record<string, RosterEntry> = {};

      Object.values(dirtyEntries).forEach((entry) => {
        const docRef = doc(db, "roster", entry.id);
        const data = { ...entry, updatedAt: timestamp };
        batch.set(docRef, data);
        entriesWithTimestamp[entry.id] = data;
      });
      await batch.commit();
      return entriesWithTimestamp;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to save roster changes",
      );
    }
  },
);

const rosterSlice = createSlice({
  name: "roster",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateLocalAssignment(
      state,
      action: PayloadAction<{
        date: string;
        teamName: string;
        userIdentifier: string;
        positionGroupNames: string[]; // [Parent, Child1, Child2...]
        maxConflict: number;
      }>,
    ) {
      const {
        date,
        teamName,
        userIdentifier,
        positionGroupNames,
        maxConflict,
      } = action.payload;

      // Get base entry (either from dirty or original)
      const entry = state.dirtyEntries[date] || state.entries[date];

      // Clone or create new
      let newEntry: RosterEntry;
      if (entry) {
        newEntry = JSON.parse(JSON.stringify(entry));
      } else {
        newEntry = { id: date, date, teams: {}, absence: {} };
      }

      if (!newEntry.teams[teamName]) {
        newEntry.teams[teamName] = {};
      }

      const userAssignments = newEntry.teams[teamName][userIdentifier] || [];

      // Find current assignment within this group (if any)
      const currentInGroupIndex = positionGroupNames.findIndex((p) =>
        userAssignments.includes(p),
      );
      const currentInGroupName =
        currentInGroupIndex >= 0
          ? positionGroupNames[currentInGroupIndex]
          : null;

      // Calculate next assignment in cycle: Parent -> Child1 -> Child2 -> ... -> None -> Parent
      let nextPositionName: string | null = null;
      if (currentInGroupName === null) {
        // Current is None, move to Parent
        nextPositionName = positionGroupNames[0];
      } else if (currentInGroupIndex < positionGroupNames.length - 1) {
        // Move to next Child
        nextPositionName = positionGroupNames[currentInGroupIndex + 1];
      } else {
        // Last Child, move to None
        nextPositionName = null;
      }

      // 1. Remove current group member from assignments
      const updatedAssignments = userAssignments.filter(
        (p) => !positionGroupNames.includes(p),
      );

      // 2. Add next member if not None
      if (nextPositionName) {
        // Check if user is absent on this date
        if (newEntry.absence[userIdentifier]) {
          state.error = `Cannot assign ${userIdentifier} because they are marked as absent on ${date}.`;
          return;
        }

        if (updatedAssignments.length < maxConflict) {
          updatedAssignments.push(nextPositionName);
        } else {
          state.error = `User already has ${maxConflict} assignment(s) in this team.`;
          return;
        }
      }

      // 3. Update entry
      if (updatedAssignments.length === 0) {
        delete newEntry.teams[teamName][userIdentifier];
      } else {
        newEntry.teams[teamName][userIdentifier] = updatedAssignments;
      }

      state.dirtyEntries[date] = newEntry;
    },
    updateLocalEventName(
      state,
      action: PayloadAction<{
        date: string;
        eventName: string;
      }>,
    ) {
      const { date, eventName } = action.payload;
      const entry = state.dirtyEntries[date] || state.entries[date];

      let newEntry: RosterEntry;
      if (entry) {
        newEntry = JSON.parse(JSON.stringify(entry));
      } else {
        newEntry = { id: date, date, teams: {}, absence: {} };
      }

      newEntry.eventName = eventName;
      state.dirtyEntries[date] = newEntry;
    },
    resetRosterEdits(state) {
      state.dirtyEntries = {};
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
    updateLocalAbsence(
      state,
      action: PayloadAction<{
        date: string;
        userIdentifier: string;
        reason?: string;
        isAbsent: boolean;
      }>,
    ) {
      const { date, userIdentifier, reason, isAbsent } = action.payload;
      const entry = state.dirtyEntries[date] || state.entries[date];

      let newEntry: RosterEntry;
      if (entry) {
        newEntry = JSON.parse(JSON.stringify(entry));
      } else {
        newEntry = { id: date, date, teams: {}, absence: {} };
      }

      if (isAbsent) {
        newEntry.absence[userIdentifier] = {
          reason: reason ?? newEntry.absence[userIdentifier]?.reason ?? '',
        };

        // Clear user's assignments across ALL teams for this date
        Object.keys(newEntry.teams).forEach((teamName) => {
          if (newEntry.teams[teamName][userIdentifier]) {
            delete newEntry.teams[teamName][userIdentifier];
          }
        });
      } else {
        delete newEntry.absence[userIdentifier];
      }

      state.dirtyEntries[date] = newEntry;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRosterEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchRosterEntries.fulfilled,
        (state, action: PayloadAction<Record<string, RosterEntry>>) => {
          state.entries = action.payload;
          state.loading = false;
        },
      )
      .addCase(fetchRosterEntries.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      })
      .addCase(saveRosterChanges.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveRosterChanges.fulfilled, (state, action) => {
        state.entries = { ...state.entries, ...action.payload };
        state.dirtyEntries = {};
        state.saving = false;
      })
      .addCase(saveRosterChanges.rejected, (state, action) => {
        state.error = action.payload as string;
        state.saving = false;
      });
  },
});

export const {
  clearError,
  updateLocalAssignment,
  updateLocalEventName,
  resetRosterEdits,
  setRosterEntries,
  setLoading,
  updateLocalAbsence,
} = rosterSlice.actions;
export const rosterReducer = rosterSlice.reducer;
