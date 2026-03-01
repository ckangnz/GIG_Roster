import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";

import { db } from "../../firebase";
import { RosterEntry, TeamRosterData, AppUser, CoverageRequest } from "../../model/model";

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
  async (orgId: string, { rejectWithValue }) => {
    try {
      const entries: Record<string, RosterEntry> = {};

      // 1. Fetch Team-Date Rosters
      const rosterRef = collection(db, "organisations", orgId, "roster");
      const rosterSnap = await getDocs(query(rosterRef));
      
      rosterSnap.docs.forEach((doc) => {
        const docData = doc.data();
        const { date, teamId, data, orgId: docOrgId } = docData;
        
        if (!entries[date]) {
          entries[date] = { id: date, date, teams: {}, absence: {}, orgId: docOrgId || orgId };
        }
        
        entries[date].teams[teamId] = data;
      });

      // 2. Fetch Absences
      const absenceRef = collection(db, "organisations", orgId, "absences");
      const absenceSnap = await getDocs(query(absenceRef));
      
      absenceSnap.docs.forEach((doc) => {
        const docData = doc.data();
        const { date, userId, reason, orgId: docOrgId } = docData;
        
        if (!entries[date]) {
          entries[date] = { id: date, date, teams: {}, absence: {}, orgId: docOrgId || orgId };
        }
        
        entries[date].absence[userId] = { reason: reason || "" };
      });

      // 3. Fetch Calendar Events (Metadata)
      const calendarRef = collection(db, "organisations", orgId, "metadata", "calendar", "events");
      const calendarSnap = await getDocs(query(calendarRef));
      calendarSnap.docs.forEach(doc => {
        const eventData = doc.data();
        if (entries[eventData.date]) {
          entries[eventData.date].eventName = eventData.eventName;
        }
      });

      return entries;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch roster",
      );
    }
  },
);

export const syncAssignmentRemote = createAsyncThunk(
  "roster/syncAssignmentRemote",
  async (
    payload: {
      date: string;
      teamName: string; // This is teamId
      userIdentifier: string;
      updatedAssignments: string[];
      slotId?: string;
    },
    { rejectWithValue, getState }
  ) => {
    const { date, teamName: teamId } = payload;

    try {
      const state = getState() as { auth: { userData: AppUser | null }, roster: RosterState };
      const orgId = state.auth.userData?.orgId;
      if (!orgId) throw new Error("Org ID missing");

      // With atomic docs, we replace the team-date doc with the latest state
      const entry = state.roster.entries[date];
      const teamData = entry?.teams[teamId];

      // Extract coverage requests for this specific team to avoid overwriting them
      const teamCoverageRequests: Record<string, CoverageRequest> = {};
      if (entry?.coverageRequests) {
        Object.entries(entry.coverageRequests).forEach(([reqId, req]) => {
          if (req.teamName === teamId) {
            teamCoverageRequests[reqId] = req;
          }
        });
      }
      
      const docId = `${teamId}_${date}`;
      const docRef = doc(db, "organisations", orgId, "roster", docId);

      await setDoc(docRef, {
        id: docId,
        orgId,
        teamId,
        date,
        data: teamData,
        coverageRequests: teamCoverageRequests,
        updatedAt: serverTimestamp()
      });
      
      return { date };
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : "Sync failed");
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
    { rejectWithValue, getState }
  ) => {
    const { date, userIdentifier, isAbsent, reason, clearedTeams } = payload;

    try {
      const state = getState() as { auth: { userData: AppUser | null }, roster: RosterState };
      const orgId = state.auth.userData?.orgId;
      if (!orgId) throw new Error("Org ID missing");

      const absenceDocId = `${userIdentifier}_${date}`;
      const absenceRef = doc(db, "organisations", orgId, "absences", absenceDocId);

      if (isAbsent) {
        // 1. Set Absence Doc
        await setDoc(absenceRef, {
          id: absenceDocId,
          orgId,
          userId: userIdentifier,
          date,
          reason: reason || "",
          updatedAt: serverTimestamp()
        });

        // 2. Cleanup Team Assignments in atomic roster docs
        const entry = state.roster.entries[date];
        for (const teamId of clearedTeams) {
          const rosterDocId = `${teamId}_${date}`;
          const rosterRef = doc(db, "organisations", orgId, "roster", rosterDocId);
          const teamData = entry?.teams[teamId];
          
          // IMPORTANT: Extract coverage requests for this specific team from the entry
          const teamCoverageRequests: Record<string, CoverageRequest> = {};
          if (entry.coverageRequests) {
            Object.entries(entry.coverageRequests).forEach(([reqId, req]) => {
              if (req.teamName === teamId) {
                teamCoverageRequests[reqId] = req;
              }
            });
          }
          
          await setDoc(rosterRef, {
            id: rosterDocId,
            orgId,
            teamId,
            date,
            data: teamData, // This is already optimistically cleaned in Redux
            coverageRequests: teamCoverageRequests, // Persist the new requests
            updatedAt: serverTimestamp()
          });
        }
      } else {
        // Remove absence
        await deleteDoc(absenceRef);
        
        // Restore assignments if needed (Undo case)
        const entry = state.roster.entries[date];
        for (const teamId of Object.keys(entry.teams)) {
          const rosterDocId = `${teamId}_${date}`;
          const rosterRef = doc(db, "organisations", orgId, "roster", rosterDocId);
          await setDoc(rosterRef, {
            id: rosterDocId,
            orgId,
            teamId,
            date,
            data: entry.teams[teamId],
            updatedAt: serverTimestamp()
          });
        }
      }

      return { date };
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : "Sync failed");
    }
  }
);

export const syncEventNameRemote = createAsyncThunk(
  "roster/syncEventNameRemote",
  async (payload: { date: string; eventName: string }, { rejectWithValue, getState }) => {
    const { date, eventName } = payload;
    try {
      const state = getState() as { auth: { userData: AppUser | null } };
      const orgId = state.auth.userData?.orgId;
      if (!orgId) throw new Error("Org ID missing");

      const docRef = doc(db, "organisations", orgId, "metadata", "calendar", "events", date);
      await setDoc(docRef, { 
        date,
        orgId,
        eventName, 
        updatedAt: serverTimestamp() 
      });
      return { date };
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : "Sync failed");
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
    { rejectWithValue, getState }
  ) => {
    const { date, requestId } = payload;
    try {
      const state = getState() as { auth: { userData: AppUser | null }, roster: RosterState };
      const orgId = state.auth.userData?.orgId;
      if (!orgId) throw new Error("Org ID missing");

      // Coverage requests were originally part of RosterEntry. 
      // In the new atomic model, we need to know which team it belonged to.
      // For now, if we don't have teamId in the payload, we might need to find it in state.
      const entry = state.roster.entries[date];
      const request = entry?.coverageRequests?.[requestId];
      const teamId = request?.teamName; // teamName field actually stores teamId

      if (teamId) {
        const docId = `${teamId}_${date}`;
        const docRef = doc(db, "organisations", orgId, "roster", docId);
        await updateDoc(docRef, {
          [`coverageRequests.${requestId}`]: deleteField(),
          updatedAt: serverTimestamp(),
        });
      }

      return { date, requestId };
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
    updateRosterTeams(state, action: PayloadAction<{ 
      teams: Record<string, Record<string, TeamRosterData | Record<string, string[]>>>,
      coverageRequests: Record<string, Record<string, CoverageRequest>>
    }>) {
      const { teams, coverageRequests } = action.payload;

      // Update Teams
      Object.entries(teams).forEach(([date, teamMap]) => {
        if (!state.entries[date]) {
          state.entries[date] = { id: date, date, teams: {}, absence: {}, orgId: "" };
        }
        state.entries[date].teams = { ...state.entries[date].teams, ...teamMap };
      });

      // Update Coverage Requests
      Object.entries(coverageRequests).forEach(([date, requests]) => {
        if (state.entries[date]) {
          state.entries[date].coverageRequests = { 
            ...state.entries[date].coverageRequests, 
            ...requests 
          };
        }
      });

      state.loading = false;
      state.initialLoad = true;
    },
    updateRosterAbsences(state, action: PayloadAction<Record<string, Record<string, { reason: string }>>>) {
      // action.payload is { date: { userId: { reason } } }
      // First, clear all absences so we can rebuild from snapshot (simplest for sync)
      Object.values(state.entries).forEach(entry => {
        entry.absence = {};
      });
      
      Object.entries(action.payload).forEach(([date, absenceMap]) => {
        if (!state.entries[date]) {
          state.entries[date] = { id: date, date, teams: {}, absence: {}, orgId: "" };
        }
        state.entries[date].absence = absenceMap;
      });
    },
    updateRosterCalendar(state, action: PayloadAction<Record<string, string>>) {
      // action.payload is { date: eventName }
      Object.entries(action.payload).forEach(([date, eventName]) => {
        if (state.entries[date]) {
          state.entries[date].eventName = eventName;
        }
      });
    },
    applyOptimisticAssignment(state, action: PayloadAction<{
      date: string;
      teamName: string;
      userIdentifier: string;
      updatedAssignments: string[];
      slotId?: string;
    }>) {
      const { date, teamName, userIdentifier, updatedAssignments, slotId } = action.payload;
      if (!state.entries[date]) {
        const existingOrgId = Object.values(state.entries)[0]?.orgId;
        if (!existingOrgId) return; // Cannot update without org context
        state.entries[date] = { id: date, date, teams: {}, absence: {}, orgId: existingOrgId };
      }
      const entry = state.entries[date];
      
      if (slotId) {
        // SLOTTED MODE
        let teamData = entry.teams[teamName] as TeamRosterData;
        if (!teamData || !('type' in teamData)) {
          teamData = { type: 'slotted', slots: {} };
          entry.teams[teamName] = teamData;
        }
        if (!teamData.slots) teamData.slots = {};
        if (!teamData.slots[slotId]) teamData.slots[slotId] = {};
        
        if (updatedAssignments.length === 0) {
          delete teamData.slots[slotId][userIdentifier];
        } else {
          teamData.slots[slotId][userIdentifier] = updatedAssignments;
        }
      } else {
        // DAILY MODE
        if (!entry.teams[teamName]) entry.teams[teamName] = {};
        const teamData = entry.teams[teamName] as Record<string, string[]>;
        
        if (updatedAssignments.length === 0) {
          delete teamData[userIdentifier];
        } else {
          teamData[userIdentifier] = updatedAssignments;
        }
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
        const existingOrgId = Object.values(state.entries)[0]?.orgId;
        if (!existingOrgId) return; // Cannot update without org context
        state.entries[date] = { id: date, date, teams: {}, absence: {}, orgId: existingOrgId };
      }
      const entry = state.entries[date];
      if (isAbsent) {
        entry.absence[userIdentifier] = { reason: reason || "" };
        Object.keys(entry.teams).forEach(tName => {
          const teamData = entry.teams[tName];
          if (teamData && 'type' in teamData && teamData.type === 'slotted') {
            Object.values(teamData.slots || {}).forEach(s => delete s[userIdentifier]);
          } else {
            delete (teamData as Record<string, string[]>)[userIdentifier];
          }
        });

        if (clearedPositions) {
          if (!entry.coverageRequests) entry.coverageRequests = {};
          const currentOrgId = entry.orgId;
          Object.entries(clearedPositions).forEach(([tName, positions]) => {
            positions.forEach(posName => {
              const reqId = `${tName}_${posName}_${userIdentifier}`.replace(/\./g, '_');
              entry.coverageRequests![reqId] = {
                orgId: currentOrgId,
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
        if (clearedPositions) {
          Object.entries(clearedPositions).forEach(([tName, positions]) => {
            if (!entry.teams[tName]) entry.teams[tName] = {};
            const teamData = entry.teams[tName] as Record<string, string[]>;
            teamData[userIdentifier] = positions;
          });
        }
      }
    },
    applyOptimisticEventName(state, action: PayloadAction<{ date: string; eventName: string }>) {
      const { date, eventName } = action.payload;
      if (!state.entries[date]) {
        const existingOrgId = Object.values(state.entries)[0]?.orgId;
        if (!existingOrgId) return; // Cannot update without org context
        state.entries[date] = { id: date, date, teams: {}, absence: {}, orgId: existingOrgId };
      }
      state.entries[date].eventName = eventName;
    },
    applyOptimisticResolve(state, action: PayloadAction<{
      date: string;
      requestId: string;
      status: "resolved" | "dismissed";
      resolvedByEmail?: string;
    }>) {
      const { date, requestId } = action.payload;
      const entry = state.entries[date];
      if (entry?.coverageRequests?.[requestId]) {
        delete entry.coverageRequests[requestId];
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
        const { date, requestId } = action.payload;
        const entry = state.entries[date];
        if (entry?.coverageRequests?.[requestId]) {
          delete entry.coverageRequests[requestId];
        }
      });
  },
});

export const {
  clearError,
  setRosterEntries,
  setLoading,
  updateRosterTeams,
  updateRosterAbsences,
  updateRosterCalendar,
  applyOptimisticAssignment,
  applyOptimisticAbsence,
  applyOptimisticEventName,
  applyOptimisticResolve,
} = rosterSlice.actions;
export const rosterReducer = rosterSlice.reducer;
