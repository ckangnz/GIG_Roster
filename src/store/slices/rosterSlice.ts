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
import {
  RosterEntry,
  TeamRosterData,
  AppUser,
  CoverageRequest,
  UserAssignments,
} from "../../model/model";

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
        const {
          date,
          teamId,
          data,
          orgId: docOrgId,
          coverageRequests,
        } = docData;

        if (!entries[date]) {
          entries[date] = {
            id: date,
            date,
            teams: {},
            absence: {},
            orgId: docOrgId || orgId,
            coverageRequests: {},
          };
        }

        entries[date].teams[teamId] = data;

        if (coverageRequests) {
          entries[date].coverageRequests = {
            ...entries[date].coverageRequests,
            ...coverageRequests,
          };
        }
      });

      // 2. Fetch Absences
      const absenceRef = collection(db, "organisations", orgId, "absences");
      const absenceSnap = await getDocs(query(absenceRef));

      absenceSnap.docs.forEach((doc) => {
        const docData = doc.data();
        const { date, userId, reason, orgId: docOrgId } = docData;

        if (!entries[date]) {
          entries[date] = {
            id: date,
            date,
            teams: {},
            absence: {},
            orgId: docOrgId || orgId,
            coverageRequests: {},
          };
        }

        entries[date].absence[userId] = { reason: reason || "" };
      });

      // 3. Fetch Calendar Events (Metadata)
      const calendarRef = collection(
        db,
        "organisations",
        orgId,
        "metadata",
        "calendar",
        "events",
      );
      const calendarSnap = await getDocs(query(calendarRef));
      calendarSnap.docs.forEach((doc) => {
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
    { rejectWithValue, getState },
  ) => {
    const { date, teamName: teamId } = payload;

    try {
      const state = getState() as {
        auth: { userData: AppUser | null };
        roster: RosterState;
      };
      const orgId = state.auth.userData?.activeOrgId;
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
        updatedAt: serverTimestamp(),
      });

      return { date };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Sync failed",
      );
    }
  },
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
    { rejectWithValue, getState },
  ) => {
    const { date, userIdentifier, isAbsent, reason, clearedTeams } = payload;

    try {
      const state = getState() as {
        auth: { userData: AppUser | null };
        roster: RosterState;
      };
      const orgId = state.auth.userData?.activeOrgId;
      if (!orgId) throw new Error("Org ID missing");

      const absenceDocId = `${userIdentifier}_${date}`;
      const absenceRef = doc(
        db,
        "organisations",
        orgId,
        "absences",
        absenceDocId,
      );

      if (isAbsent) {
        // 1. Set Absence Doc
        await setDoc(absenceRef, {
          id: absenceDocId,
          orgId,
          userId: userIdentifier,
          date,
          reason: reason || "",
          updatedAt: serverTimestamp(),
        });

        // 2. Cleanup Team Assignments in atomic roster docs
        const entry = state.roster.entries[date];
        for (const teamId of clearedTeams) {
          const rosterDocId = `${teamId}_${date}`;
          const rosterRef = doc(
            db,
            "organisations",
            orgId,
            "roster",
            rosterDocId,
          );
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
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        // Remove absence
        await deleteDoc(absenceRef);

        // Restore assignments if needed (Undo case)
        const entry = state.roster.entries[date];
        for (const teamId of Object.keys(entry.teams)) {
          const rosterDocId = `${teamId}_${date}`;
          const rosterRef = doc(
            db,
            "organisations",
            orgId,
            "roster",
            rosterDocId,
          );
          await setDoc(rosterRef, {
            id: rosterDocId,
            orgId,
            teamId,
            date,
            data: entry.teams[teamId],
            updatedAt: serverTimestamp(),
          });
        }
      }

      return { date };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Sync failed",
      );
    }
  },
);

export const syncEventNameRemote = createAsyncThunk(
  "roster/syncEventNameRemote",
  async (
    payload: { date: string; eventName: string },
    { rejectWithValue, getState },
  ) => {
    const { date, eventName } = payload;
    try {
      const state = getState() as { auth: { userData: AppUser | null } };
      const orgId = state.auth.userData?.activeOrgId;
      if (!orgId) throw new Error("Org ID missing");

      const docRef = doc(
        db,
        "organisations",
        orgId,
        "metadata",
        "calendar",
        "events",
        date,
      );
      await setDoc(docRef, {
        date,
        orgId,
        eventName,
        updatedAt: serverTimestamp(),
      });
      return { date };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Sync failed",
      );
    }
  },
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
    { rejectWithValue, getState },
  ) => {
    const { date, requestId } = payload;
    try {
      const state = getState() as {
        auth: { userData: AppUser | null };
        roster: RosterState;
      };
      const orgId = state.auth.userData?.activeOrgId;
      if (!orgId) throw new Error("Org ID missing");

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
      return rejectWithValue(
        error instanceof Error ? error.message : "Resolution failed",
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
    setRosterEntries(
      state,
      action: PayloadAction<Record<string, RosterEntry>>,
    ) {
      state.entries = action.payload;
      state.loading = false;
      state.initialLoad = true;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    updateRosterTeams(
      state,
      action: PayloadAction<{
        teams: Record<string, Record<string, TeamRosterData | UserAssignments>>;
        coverageRequests: Record<string, Record<string, CoverageRequest>>;
      }>,
    ) {
      const { teams, coverageRequests } = action.payload;
      const newEntries = { ...state.entries };

      // 1. Update Teams
      Object.entries(teams).forEach(([date, teamMap]) => {
        const existingEntry = newEntries[date] || {
          id: date,
          date,
          teams: {},
          absence: {},
          orgId: "",
          coverageRequests: {},
        };
        newEntries[date] = {
          ...existingEntry,
          teams: { ...existingEntry.teams, ...teamMap },
        };
      });

      // 2. Update Coverage Requests - PER DATE REPLACEMENT
      Object.keys(coverageRequests).forEach((date) => {
        const existingEntry = newEntries[date] || {
          id: date,
          date,
          teams: {},
          absence: {},
          orgId: "",
          coverageRequests: {},
        };
        newEntries[date] = {
          ...existingEntry,
          coverageRequests: { ...coverageRequests[date] },
        };
      });

      state.entries = newEntries;
      state.loading = false;
      state.initialLoad = true;
    },
    updateRosterAbsences(
      state,
      action: PayloadAction<Record<string, Record<string, { reason: string }>>>,
    ) {
      const newEntries = { ...state.entries };
      Object.entries(action.payload).forEach(([date, absenceMap]) => {
        const existingEntry = newEntries[date] || {
          id: date,
          date,
          teams: {},
          absence: {},
          orgId: "",
          coverageRequests: {},
        };
        newEntries[date] = {
          ...existingEntry,
          absence: absenceMap,
        };
      });
      state.entries = newEntries;
    },
    updateRosterCalendar(state, action: PayloadAction<Record<string, string>>) {
      const newEntries = { ...state.entries };
      Object.entries(action.payload).forEach(([date, eventName]) => {
        if (newEntries[date]) {
          newEntries[date] = { ...newEntries[date], eventName };
        }
      });
      state.entries = newEntries;
    },
    applyOptimisticAssignment(
      state,
      action: PayloadAction<{
        date: string;
        teamName: string;
        userIdentifier: string;
        updatedAssignments: string[];
        slotId?: string;
      }>,
    ) {
      const { date, teamName, userIdentifier, updatedAssignments, slotId } =
        action.payload;
      const newEntries = { ...state.entries };

      if (!newEntries[date]) {
        const existingOrgId = Object.values(state.entries)[0]?.orgId || "";
        newEntries[date] = {
          id: date,
          date,
          teams: {},
          absence: {},
          orgId: existingOrgId,
          coverageRequests: {},
        };
      }

      const entry = { ...newEntries[date] };
      const newTeams = { ...entry.teams };

      if (slotId) {
        let teamData = { ...(newTeams[teamName] as TeamRosterData) };
        if (!teamData || !("type" in teamData)) {
          teamData = { type: "slotted", slots: {} };
        }
        const newSlots = { ...(teamData.slots || {}) };
        const slotAssignments = { ...(newSlots[slotId] || {}) };

        if (updatedAssignments.length === 0) {
          delete slotAssignments[userIdentifier];
        } else {
          slotAssignments[userIdentifier] = updatedAssignments;
        }

        newSlots[slotId] = slotAssignments;
        newTeams[teamName] = { ...teamData, slots: newSlots };
      } else {
        const teamData = { ...(newTeams[teamName] as UserAssignments) };
        if (updatedAssignments.length === 0) {
          delete teamData[userIdentifier];
        } else {
          teamData[userIdentifier] = updatedAssignments;
        }
        newTeams[teamName] = teamData;
      }

      entry.teams = newTeams;

      // --- AUTOMATIC RESOLUTION ---
      // If we are assigning positions, resolve any matching coverage requests
      if (updatedAssignments.length > 0 && entry.coverageRequests) {
        const newRequests = { ...entry.coverageRequests };
        let changed = false;

        Object.entries(newRequests).forEach(([reqId, req]) => {
          const matchesTeam = req.teamName === teamName;
          const matchesSlot = !slotId || req.slotId === slotId;
          const matchesPos = updatedAssignments.includes(req.positionName);

          if (
            req.status === "open" &&
            matchesTeam &&
            matchesPos &&
            matchesSlot
          ) {
            delete newRequests[reqId];
            changed = true;
          }
        });

        if (changed) {
          entry.coverageRequests = newRequests;
        }
      }

      newEntries[date] = entry;
      state.entries = newEntries;
    },
    applyOptimisticAbsence(
      state,
      action: PayloadAction<{
        date: string;
        userIdentifier: string;
        isAbsent: boolean;
        reason?: string;
        clearedPositions?: Record<string, string[]>;
        userName?: string;
      }>,
    ) {
      const {
        date,
        userIdentifier,
        isAbsent,
        reason,
        clearedPositions,
        userName,
      } = action.payload;
      const newEntries = { ...state.entries };

      if (!newEntries[date]) {
        const existingOrgId = Object.values(state.entries)[0]?.orgId || "";
        newEntries[date] = {
          id: date,
          date,
          teams: {},
          absence: {},
          orgId: existingOrgId,
          coverageRequests: {},
        };
      }

      const entry = { ...newEntries[date] };

      if (isAbsent) {
        entry.absence = {
          ...entry.absence,
          [userIdentifier]: { reason: reason || "" },
        };

        const newTeams = { ...entry.teams };
        Object.keys(newTeams).forEach((tName) => {
          const teamData = newTeams[tName];
          if (
            teamData &&
            "type" in (teamData as TeamRosterData) &&
            (teamData as TeamRosterData).type === "slotted"
          ) {
            const slottedData = teamData as TeamRosterData;
            const newSlots = { ...(slottedData.slots || {}) };
            Object.keys(newSlots).forEach((sId) => {
              const slotData = { ...(newSlots[sId] || {}) };
              delete slotData[userIdentifier];
              newSlots[sId] = slotData;
            });
            newTeams[tName] = { ...slottedData, slots: newSlots };
          } else {
            const teamDataFlat = { ...(teamData as UserAssignments) };
            delete teamDataFlat[userIdentifier];
            newTeams[tName] = teamDataFlat;
          }
        });
        entry.teams = newTeams;

        if (clearedPositions) {
          const newRequests = { ...(entry.coverageRequests || {}) };
          const currentOrgId = entry.orgId;
          Object.entries(clearedPositions).forEach(([tName, positions]) => {
            positions.forEach((posName) => {
              const reqId = `${tName}_${posName}_${userIdentifier}`.replace(
                /\./g,
                "_",
              );
              newRequests[reqId] = {
                orgId: currentOrgId,
                teamName: tName,
                positionName: posName,
                absentUserEmail: userIdentifier,
                absentUserName: userName || userIdentifier,
                requestedAt: Date.now(),
                status: "open",
              };
            });
          });
          entry.coverageRequests = newRequests;
        }
      } else {
        const newAbsence = { ...entry.absence };
        delete newAbsence[userIdentifier];
        entry.absence = newAbsence;

        if (entry.coverageRequests) {
          const newRequests = { ...entry.coverageRequests };
          let changed = false;
          Object.keys(newRequests).forEach((reqId) => {
            if (reqId.includes(userIdentifier.replace(/\./g, "_"))) {
              delete newRequests[reqId];
              changed = true;
            }
          });
          if (changed) entry.coverageRequests = newRequests;
        }

        if (clearedPositions) {
          const newTeams = { ...entry.teams };
          Object.entries(clearedPositions).forEach(([tName, positions]) => {
            const teamData = { ...(newTeams[tName] || {}) } as UserAssignments;
            teamData[userIdentifier] = positions;
            newTeams[tName] = teamData;
          });
          entry.teams = newTeams;
        }
      }

      newEntries[date] = entry;
      state.entries = newEntries;
    },
    applyOptimisticEventName(
      state,
      action: PayloadAction<{ date: string; eventName: string }>,
    ) {
      const { date, eventName } = action.payload;
      const newEntries = { ...state.entries };
      if (!newEntries[date]) {
        const existingOrgId = Object.values(state.entries)[0]?.orgId || "";
        newEntries[date] = {
          id: date,
          date,
          teams: {},
          absence: {},
          orgId: existingOrgId,
          coverageRequests: {},
        };
      }
      newEntries[date] = { ...newEntries[date], eventName };
      state.entries = newEntries;
    },
    applyOptimisticResolve(
      state,
      action: PayloadAction<{
        date: string;
        requestId: string;
        status: "resolved" | "dismissed";
        resolvedByEmail?: string;
      }>,
    ) {
      const { date, requestId } = action.payload;
      const currentEntries = state.entries;
      const entry = currentEntries[date];

      if (entry?.coverageRequests?.[requestId]) {
        const newRequests = { ...entry.coverageRequests };
        delete newRequests[requestId];

        state.entries = {
          ...currentEntries,
          [date]: {
            ...entry,
            coverageRequests: newRequests,
          },
        };
      }
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
        const currentEntries = state.entries;
        const entry = currentEntries[date];

        if (entry?.coverageRequests?.[requestId]) {
          const newRequests = { ...entry.coverageRequests };
          delete newRequests[requestId];

          state.entries = {
            ...currentEntries,
            [date]: {
              ...entry,
              coverageRequests: newRequests,
            },
          };
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
