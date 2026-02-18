import { useEffect } from "react";

import { collection, onSnapshot, query, doc } from "firebase/firestore";

import { useAppDispatch, useAppSelector } from "./redux";
import { db } from "../firebase";
import { useTrackPresence } from "./usePresence";
import { RosterEntry, AppUser, Team } from "../model/model";
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
 * Called in MainLayout.
 */
export const useAppListeners = () => {
  const dispatch = useAppDispatch();
  const { firebaseUser, userData } = useAppSelector((state) => state.auth);

  // Track presence globally
  useTrackPresence(userData);

  useEffect(() => {
    // 1. Roster Listener
    dispatch(setRosterLoading(true));
    const rosterQuery = query(collection(db, "roster"));
    const unsubscribeRoster = onSnapshot(
      rosterQuery,
      (snapshot) => {
        const entries: Record<string, RosterEntry> = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const updatedAt = data.updatedAt;
          const serializableData = {
            ...data,
            updatedAt:
              updatedAt &&
              typeof updatedAt === "object" &&
              "toMillis" in updatedAt
                ? (updatedAt as { toMillis: () => number }).toMillis()
                : (updatedAt as number | undefined),
          };
          entries[doc.id] = { ...serializableData, id: doc.id } as RosterEntry;
        });
        dispatch(setRosterEntries(entries));
      },
      (err) => console.error("Roster sync error:", err),
    );

    // 2. Metadata (Teams & Positions) Listener
    const unsubscribeTeams = onSnapshot(
      doc(db, "metadata", "teams"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const teamsList = Array.isArray(data.list)
            ? data.list.map((t: Team) => ({
                ...t,
                maxConflict: t.maxConflict || 1,
              }))
            : [];
          dispatch(setTeams(teamsList));
        }
      },
      (err) => console.error("Teams sync error:", err),
    );

    const unsubscribePositions = onSnapshot(
      doc(db, "metadata", "positions"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const positionsList = Array.isArray(data.list) ? data.list : [];
          dispatch(setPositions(positionsList));
        }
      },
      (err) => console.error("Positions sync error:", err),
    );

    // 3. User Management (All Users) Listener
    const unsubscribeAllUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const users: (AppUser & { id: string })[] = [];
        snapshot.forEach((doc) => {
          users.push({ ...(doc.data() as AppUser), id: doc.id });
        });
        const sortedUsers = users.sort((a, b) =>
          (a.name || "").localeCompare(b.name || ""),
        );
        dispatch(setAllUsers(sortedUsers));
      },
      (err) => console.error("Users sync error:", err),
    );

    return () => {
      unsubscribeRoster();
      unsubscribeTeams();
      unsubscribePositions();
      unsubscribeAllUsers();
    };
  }, [dispatch]);

  // 4. Current User Profile Listener (Dynamic based on login status)
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const unsubscribeProfile = onSnapshot(
      doc(db, "users", firebaseUser.uid),
      (snap) => {
        if (snap.exists()) {
          dispatch(setUserData(snap.data() as AppUser));
        }
      },
      (err) => console.error("Profile sync error:", err),
    );

    return () => unsubscribeProfile();
  }, [dispatch, firebaseUser?.uid]);
};
