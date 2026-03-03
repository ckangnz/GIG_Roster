import { useEffect } from "react";

import { collection, onSnapshot, query, doc } from "firebase/firestore";

import { useAppDispatch, useAppSelector } from "./redux";
import { db } from "../firebase";
import { useTrackPresence, usePresenceListener } from "./usePresence";
import i18n from "../i18n/config";
import {
  AppUser,
  Team,
  Position,
  CoverageRequest,
  TeamRosterData,
  OrgMembership,
} from "../model/model";
import { setMembership, setUserData } from "../store/slices/authSlice";
import { setPositions } from "../store/slices/positionsSlice";
import {
  setLoading as setRosterLoading,
  updateRosterTeams,
  updateRosterAbsences,
  updateRosterCalendar,
} from "../store/slices/rosterSlice";
import { setTeams } from "../store/slices/teamsSlice";
import { setAllUsers, setAllMemberships, setAllUserProfiles } from "../store/slices/userManagementSlice";

/**
 * Master hook to manage all real-time Firestore listeners for the app.
 */
export const useAppListeners = () => {
  const dispatch = useAppDispatch();
  const { firebaseUser, userData, activeOrgId, membership } = useAppSelector((state) => state.auth);
  
  const isApproved = membership?.isApproved || false;

  useTrackPresence(firebaseUser, userData);
  usePresenceListener();

  useEffect(() => {
    if (!firebaseUser?.uid || !activeOrgId) return;

    // 0. Current Membership Listener
    const unsubMembership = onSnapshot(
      doc(db, "organisations", activeOrgId, "memberships", firebaseUser.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as OrgMembership;
          dispatch(setMembership(data));
          if (data.preferredLanguage) {
            i18n.changeLanguage(data.preferredLanguage);
          }
        } else {
          dispatch(setMembership(null));
        }
      },
      (err) => console.error("Membership Listener Error:", err.message)
    );

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
          const teamUpdates: Record<string, Record<string, TeamRosterData | Record<string, string[]>>> = {};
          const coverageUpdates: Record<string, Record<string, CoverageRequest>> = {};

          snap.docs.forEach(d => {
            const docData = d.data();
            const { date, teamId, data: rosterData, coverageRequests } = docData;
            
            // 1. Handle Team Data
            if (!teamUpdates[date]) teamUpdates[date] = {};
            teamUpdates[date][teamId] = rosterData;

            // 2. Handle Coverage Requests (at root of doc)
            if (!coverageUpdates[date]) coverageUpdates[date] = {};
            if (coverageRequests) {
              Object.assign(coverageUpdates[date], coverageRequests);
            }
          });

          dispatch(updateRosterTeams({ teams: teamUpdates, coverageRequests: coverageUpdates }));
        },
        (err) => {
          console.error("Roster Listener Error:", err.message);
          dispatch(setRosterLoading(false));
        }
      );

      // b) Absences Listener
      unsubAbsences = onSnapshot(
        query(collection(db, "organisations", activeOrgId, "absences")),
        (snap) => {
          const absenceUpdates: Record<string, Record<string, { reason: string }>> = {};
          snap.docs.forEach(d => {
            const data = d.data();
            const { date, userId, reason } = data;
            if (!absenceUpdates[date]) absenceUpdates[date] = {};
            absenceUpdates[date][userId] = { reason: reason || "" };
          });
          dispatch(updateRosterAbsences(absenceUpdates));
        },
        (err) => console.error("Absences Listener Error:", err.message)
      );

      // c) Calendar Events Listener
      unsubCalendar = onSnapshot(
        query(collection(db, "organisations", activeOrgId, "metadata", "calendar", "events")),
        (snap) => {
          const calendarUpdates: Record<string, string> = {};
          snap.docs.forEach(d => {
            const data = d.data();
            const { date, eventName } = data;
            calendarUpdates[date] = eventName || "";
          });
          dispatch(updateRosterCalendar(calendarUpdates));
        },
        (err) => console.error("Calendar Listener Error:", err.message)
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
      doc(db, "organisations", activeOrgId, "metadata", "positions"),
      (snap) => {
        const docData = snap.data();
        const list = (docData?.list || []).map((p: Position) => ({ ...p, orgId: activeOrgId }));
        dispatch(setPositions(list));
      },
      (err) => {
        console.error("Positions Listener Error:", err.message);
        dispatch(setPositions([]));
      }
    );

    // 3. User Management (Listen to memberships sub-collection)
    const unsubAllMemberships = onSnapshot(
      collection(db, "organisations", activeOrgId, "memberships"),
      (memSnap) => {
        const memberships: Record<string, OrgMembership> = {};
        memSnap.forEach(d => {
          memberships[d.id] = { ...(d.data() as OrgMembership), id: d.id };
        });
        
        // We'll join this data with the full users list in a separate effect or by dispatching a join
        dispatch(setAllMemberships(memberships));
      },
      (err) => console.error("Memberships Listener Error:", err.message)
    );

    return () => {
      unsubMembership();
      if (unsubRoster) unsubRoster();
      if (unsubAbsences) unsubAbsences();
      if (unsubCalendar) unsubCalendar();
      unsubTeams();
      unsubPositions();
      unsubAllMemberships();
    };
  }, [dispatch, firebaseUser?.uid, activeOrgId, isApproved]);

  // 4. Global User Profiles Sync (Listen to all relevant users)
  // For now, simple approach: listen to ALL users once.
  // In a large app, we'd query only for the UIDs in the memberships.
  useEffect(() => {
    if (!activeOrgId) return;
    
    return onSnapshot(collection(db, "users"), (snap) => {
      const allProfiles: Record<string, AppUser> = {};
      snap.forEach(doc => {
        allProfiles[doc.id] = { ...(doc.data() as AppUser), id: doc.id };
      });
      dispatch(setAllUserProfiles(allProfiles));
    });
  }, [dispatch, activeOrgId]);

  // 5. Join Profiles + Memberships whenever either changes
  const memberships = useAppSelector(state => state.userManagement.memberships);
  const profiles = useAppSelector(state => state.userManagement.profiles);

  useEffect(() => {
    if (!activeOrgId) return;
    
    const joinedUsers: (AppUser & { id: string })[] = [];
    Object.keys(memberships).forEach(userId => {
      const profile = profiles[userId];
      if (profile) {
        joinedUsers.push({
          ...profile,
          id: userId,
          organisations: { [activeOrgId]: memberships[userId] } as Record<string, OrgMembership>
        });
      }
    });
    
    if (joinedUsers.length > 0) {
      dispatch(setAllUsers(joinedUsers.sort((a, b) => (a.name || "").localeCompare(b.name || ""))));
    }
  }, [dispatch, memberships, profiles, activeOrgId]);

  // 6. Own Profile Sync
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    return onSnapshot(doc(db, "users", firebaseUser.uid), (snap) => {
      if (snap.exists()) dispatch(setUserData(snap.data() as AppUser));
    });
  }, [dispatch, firebaseUser?.uid]);
};
