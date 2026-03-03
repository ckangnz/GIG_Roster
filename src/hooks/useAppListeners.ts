import { useEffect } from "react";

import { collection, onSnapshot, query, doc } from "firebase/firestore";

import { useAppDispatch, useAppSelector } from "./redux";
import { db } from "../firebase";
import { useTrackPresence, usePresenceListener } from "./usePresence";
import {
  AppUser,
  Team,
  Position,
  CoverageRequest,
  TeamRosterData,
} from "../model/model";
import { setUserData } from "../store/slices/authSlice";
import { setPositions } from "../store/slices/positionsSlice";
import {
  setLoading as setRosterLoading,
  updateRosterTeams,
  updateRosterAbsences,
  updateRosterCalendar,
} from "../store/slices/rosterSlice";
import { setTeams } from "../store/slices/teamsSlice";
import { setAllUsers } from "../store/slices/userManagementSlice";

/**
 * Master hook to manage all real-time Firestore listeners for the app.
 */
export const useAppListeners = () => {
  const dispatch = useAppDispatch();
  const { firebaseUser, userData } = useAppSelector((state) => state.auth);

  const activeOrgId = userData?.activeOrgId || null;
  const orgMembership = activeOrgId
    ? userData?.organisations[activeOrgId]
    : null;
  const isApproved = orgMembership?.isApproved || false;

  useTrackPresence(firebaseUser, userData);
  usePresenceListener();

  useEffect(() => {
    if (!activeOrgId) return;

    let unsubRoster: (() => void) | null = null;
    let unsubAbsences: (() => void) | null = null;
    let unsubCalendar: (() => void) | null = null;

    // 1. Roster, Absences & Calendar (Permission-Locked)
    if (isApproved) {
      dispatch(setRosterLoading(true));

      // a) Team-Date Roster Documents
      unsubRoster = onSnapshot(
        query(collection(db, "organisations", activeOrgId, "roster")),
        (snap) => {
          const teamUpdates: Record<
            string,
            Record<string, TeamRosterData | Record<string, string[]>>
          > = {};
          const coverageUpdates: Record<
            string,
            Record<string, CoverageRequest>
          > = {};

          snap.docs.forEach((d) => {
            const docData = d.data();
            const {
              date,
              teamId,
              data: rosterData,
              coverageRequests,
            } = docData;

            // 1. Handle Team Data
            if (!teamUpdates[date]) teamUpdates[date] = {};
            teamUpdates[date][teamId] = rosterData;

            // 2. Handle Coverage Requests (at root of doc)
            if (!coverageUpdates[date]) coverageUpdates[date] = {};
            if (coverageRequests) {
              Object.assign(coverageUpdates[date], coverageRequests);
            }
          });

          dispatch(
            updateRosterTeams({
              teams: teamUpdates,
              coverageRequests: coverageUpdates,
            }),
          );
        },
        (err) => {
          console.error("Roster Listener Error:", err.message);
          dispatch(setRosterLoading(false));
        },
      );

      // b) Absences Listener
      unsubAbsences = onSnapshot(
        query(collection(db, "organisations", activeOrgId, "absences")),
        (snap) => {
          const absenceUpdates: Record<
            string,
            Record<string, { reason: string }>
          > = {};
          snap.docs.forEach((d) => {
            const data = d.data();
            const { date, userId, reason } = data;
            if (!absenceUpdates[date]) absenceUpdates[date] = {};
            absenceUpdates[date][userId] = { reason: reason || "" };
          });
          dispatch(updateRosterAbsences(absenceUpdates));
        },
        (err) => console.error("Absences Listener Error:", err.message),
      );

      // c) Calendar Events Listener
      unsubCalendar = onSnapshot(
        query(
          collection(
            db,
            "organisations",
            activeOrgId,
            "metadata",
            "calendar",
            "events",
          ),
        ),
        (snap) => {
          const calendarUpdates: Record<string, string> = {};
          snap.docs.forEach((d) => {
            const data = d.data();
            const { date, eventName } = data;
            calendarUpdates[date] = eventName || "";
          });
          dispatch(updateRosterCalendar(calendarUpdates));
        },
        (err) => console.error("Calendar Listener Error:", err.message),
      );
    }

    // 2. Metadata (Teams & Positions)
    const unsubTeams = onSnapshot(
      doc(db, "organisations", activeOrgId, "metadata", "teams"),
      (snap) => {
        const docData = snap.data();
        const list = (docData?.list || []).map((t: Team) => ({
          ...t,
          orgId: activeOrgId,
          id: t.id || t.name,
          maxConflict: t.maxConflict || 1,
          positions: (t.positions || []).map((p: string | { id?: string }) =>
            typeof p === "string" ? p : p.id || "",
          ),
        }));
        dispatch(setTeams(list));
      },
      (err) => {
        console.error("Teams Listener Error:", err.message);
        dispatch(setTeams([]));
      },
    );

    const unsubPositions = onSnapshot(
      doc(db, "organisations", activeOrgId, "metadata", "positions"),
      (snap) => {
        const docData = snap.data();
        const list = (docData?.list || []).map((p: Position) => ({
          ...p,
          orgId: activeOrgId,
        }));
        dispatch(setPositions(list));
      },
      (err) => {
        console.error("Positions Listener Error:", err.message);
        dispatch(setPositions([]));
      },
    );

    // 3. User Management
    // Fetch users and filter by organisation membership in memory
    const unsubAllUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const users = snap.docs
          .map((d) => ({ ...(d.data() as AppUser), id: d.id }))
          .filter((u) => u.organisations && u.organisations[activeOrgId]); // Only users who belong to this org

        dispatch(
          setAllUsers(
            users.sort((a, b) => (a.name || "").localeCompare(b.name || "")),
          ),
        );
      },
      (err) => console.error("Users Listener Error:", err.message),
    );

    return () => {
      if (unsubRoster) unsubRoster();
      if (unsubAbsences) unsubAbsences();
      if (unsubCalendar) unsubCalendar();
      unsubTeams();
      unsubPositions();
      unsubAllUsers();
    };
  }, [dispatch, activeOrgId, isApproved]);

  // 4. Profile Sync
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    return onSnapshot(doc(db, "users", firebaseUser.uid), (snap) => {
      if (snap.exists()) dispatch(setUserData(snap.data() as AppUser));
    });
  }, [dispatch, firebaseUser?.uid]);
};
