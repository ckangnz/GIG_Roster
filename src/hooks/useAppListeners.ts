import { useEffect } from "react";

import { collection, onSnapshot, query, doc, where } from "firebase/firestore";

import { useAppDispatch, useAppSelector } from "./redux";
import { db } from "../firebase";
import { useTrackPresence, usePresenceListener } from "./usePresence";
import { RosterEntry, AppUser, Team, Position } from "../model/model";
import { setUserData } from "../store/slices/authSlice";
import { setPositions } from "../store/slices/positionsSlice";
import {
  setRosterEntries,
  setLoading as setRosterLoading,
} from "../store/slices/rosterSlice";
import { setTeams } from "../store/slices/teamsSlice";
import { setAllUsers } from "../store/slices/userManagementSlice";

/**
 * Master hook to manage all real-time Firestore listeners for the app.
 */
export const useAppListeners = () => {
  const dispatch = useAppDispatch();
  const { firebaseUser, userData } = useAppSelector((state) => state.auth);
  
  const orgId = userData?.orgId || null;
  const isApproved = userData?.isApproved || false;

  useTrackPresence(firebaseUser, userData);
  usePresenceListener();

  useEffect(() => {
    if (!orgId) return;

    // We store unsubs to clean up
    let unsubRoster: (() => void) | null = null;
    let unsubAbsences: (() => void) | null = null;

    // 1. Roster & Absences (Permission-Locked)
    if (isApproved) {
      dispatch(setRosterLoading(true));
      
      unsubRoster = onSnapshot(
        query(collection(db, "organisations", orgId, "roster")),
        (snap) => {
          const entries: Record<string, RosterEntry> = {};
          snap.docs.forEach(d => {
            const data = d.data();
            const { date, teamId, data: rosterData, orgId: docOrgId } = data;
            if (!entries[date]) {
              entries[date] = { id: date, date, teams: {}, absence: {}, orgId: docOrgId || orgId };
            }
            entries[date].teams[teamId] = rosterData;
          });
          dispatch(setRosterEntries(entries));
        },
        (err) => {
          console.error("Roster Listener Error:", err.message);
          dispatch(setRosterLoading(false));
        }
      );

      unsubAbsences = onSnapshot(
        query(collection(db, "organisations", orgId, "absences")),
        (snap) => {
          // Future: Logic to merge absences into Redux state
          // For now, we rely on the initial fetch + manual syncs if needed
          void snap;
        },
        (err) => console.error("Absences Listener Error:", err.message)
      );
    }

    // 2. Metadata (Teams & Positions)
    const unsubTeams = onSnapshot(
      doc(db, "organisations", orgId, "metadata", "teams"),
      (snap) => {
        const docData = snap.data();
        const list = (docData?.list || []).map((t: Team) => ({
          ...t,
          orgId,
          id: t.id || t.name,
          maxConflict: t.maxConflict || 1,
          positions: (t.positions || []).map((p: string | { id?: string }) => 
            typeof p === 'string' ? p : (p.id || '')
          )
        }));
        dispatch(setTeams(list));
      },
      (err) => {
        console.error("Teams Listener Error:", err.message);
        dispatch(setTeams([]));
      }
    );

    const unsubPositions = onSnapshot(
      doc(db, "organisations", orgId, "metadata", "positions"),
      (snap) => {
        const docData = snap.data();
        const list = (docData?.list || []).map((p: Position) => ({ ...p, orgId }));
        dispatch(setPositions(list));
      },
      (err) => {
        console.error("Positions Listener Error:", err.message);
        dispatch(setPositions([]));
      }
    );

    // 3. User Management
    const unsubAllUsers = onSnapshot(
      query(collection(db, "users"), where("orgId", "==", orgId)),
      (snap) => {
        const users = snap.docs.map(d => ({ ...(d.data() as AppUser), id: d.id }));
        dispatch(setAllUsers(users.sort((a, b) => (a.name || "").localeCompare(b.name || ""))));
      },
      (err) => console.error("Users Listener Error:", err.message)
    );

    return () => {
      if (unsubRoster) unsubRoster();
      if (unsubAbsences) unsubAbsences();
      unsubTeams();
      unsubPositions();
      unsubAllUsers();
    };
  }, [dispatch, orgId, isApproved]);

  // 4. Profile Sync
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    return onSnapshot(
      doc(db, "users", firebaseUser.uid),
      (snap) => {
        if (snap.exists()) dispatch(setUserData(snap.data() as AppUser));
      }
    );
  }, [dispatch, firebaseUser?.uid]);
};
