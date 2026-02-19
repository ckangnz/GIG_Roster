import { useEffect, useRef, useMemo } from "react";

import { User } from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  onSnapshot, 
  getDocs,
  query, 
  where,
  serverTimestamp,
  DocumentData,
  QuerySnapshot,
  updateDoc
} from "firebase/firestore";
import { useParams } from "react-router-dom";

import { db, auth } from "../firebase";
import { useAppDispatch, useAppSelector } from "./redux";
import { AppUser, Position } from "../model/model";
import { setOnlineUsers, setPresenceError } from "../store/slices/presenceSlice";

export interface PresenceFocus {
  date: string;
  identifier: string; // email or custom label
  teamName: string;
  viewName?: string; // "All", "Absence", or PositionName
}

export interface PresenceUser {
  uid: string;
  userUid: string;
  name: string;
  email: string;
  lastSeen: number; 
  color: string;
  focus?: PresenceFocus | null;
}

const getSessionId = () => {
  try {
    const key = 'gig_roster_session_id';
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return Math.random().toString(36).substring(2, 10);
  }
};

const getSessionColor = () => {
  try {
    const key = 'gig_roster_session_color';
    let color = sessionStorage.getItem(key);
    if (!color) {
      const PRETTY_COLORS = [
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", 
        "#F78FB3", "#BB8FCE", "#82E0AA", "#F1948A", "#85C1E9", 
        "#76D7C4", "#F8C471", "#C39BD3", "#7FB3D5", "#7DCEA0", 
        "#F0B27A", "#5DADE2", "#D7BDE2", "#A9CCE3", "#A3E4D7"
      ];
      const randomIndex = Math.floor(Math.random() * PRETTY_COLORS.length);
      color = PRETTY_COLORS[randomIndex];
      sessionStorage.setItem(key, color);
    }
    return color;
  } catch {
    return "#FF6B6B";
  }
};

export const currentSessionId = getSessionId();
const sessionColor = getSessionColor();

const HEARTBEAT_INTERVAL = 60000;
const PRESENCE_THRESHOLD = 90000;

export const useTrackPresence = (firebaseUser: User | null, userData: AppUser | null) => {
  const hasCleanedUp = useRef(false);
  const { teamName, positionName: activePosition } = useParams();
  
  const { focusedCell } = useAppSelector(state => state.ui);
  const { rosterDates, users, allTeamUsers } = useAppSelector(state => state.rosterView);
  const { positions: allPositions } = useAppSelector(state => state.positions);
  
  const currentFocus: PresenceFocus | null = useMemo(() => {
    // If no specific cell is focused, we still want to broadcast the VIEW level focus for the sidebar
    if (!teamName) return null;

    let identifier = "";
    let date = "";

    if (focusedCell) {
      date = rosterDates[focusedCell.row] || "";
      if (focusedCell.table === "absence") {
        identifier = allTeamUsers[focusedCell.col]?.email || "";
      } else if (focusedCell.table === "roster") {
        const currentPos = allPositions.find((p: Position) => p.name === activePosition);
        if (currentPos?.isCustom) {
          identifier = currentPos.customLabels?.[focusedCell.col] || "";
        } else {
          const sorted = users.filter(u => u.isActive); 
          identifier = sorted[focusedCell.col]?.email || "";
        }
      }
    }

    return {
      date,
      identifier,
      teamName,
      viewName: activePosition // Tracks "All", "Absence", or PositionName
    };
  }, [focusedCell, rosterDates, users, allTeamUsers, teamName, allPositions, activePosition]);

  useEffect(() => {
    if (!firebaseUser?.uid || !userData?.email) return;

    const docId = `${firebaseUser.uid}_${currentSessionId}`;
    const userRef = doc(db, "presence", docId);
    
    if (!hasCleanedUp.current) {
      hasCleanedUp.current = true;
      const selfCleanup = async () => {
        try {
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
          const q = query(collection(db, "presence"), where("userUid", "==", firebaseUser.uid));
          const snapshot = await getDocs(q);
          snapshot.forEach((docSnap) => {
            const lastSeen = docSnap.data().lastSeen?.toDate?.() || new Date(0);
            if (docSnap.id !== docId && lastSeen < tenMinutesAgo) {
              deleteDoc(docSnap.ref).catch(() => {});
            }
          });
        } catch { /* silent */ }
      };
      selfCleanup();
    }

    const markOnline = async (focusData: PresenceFocus | null = currentFocus) => {
      if (!auth.currentUser || document.visibilityState !== 'visible') return;
      try {
        await setDoc(userRef, {
          uid: docId,
          userUid: firebaseUser.uid,
          name: userData.name || firebaseUser.displayName || "Anonymous",
          email: userData.email,
          color: sessionColor,
          lastSeen: serverTimestamp(),
          focus: focusData,
        }, { merge: true });
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        if (error.code !== "unavailable") {
          console.warn("[Presence] Heartbeat failed:", error.message);
        }
      }
    };

    const markOffline = () => {
      deleteDoc(userRef).catch(() => {});
    };

    markOnline();
    
    const heartbeat = setInterval(() => markOnline(currentFocus), HEARTBEAT_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markOnline();
      } else {
        markOffline();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", markOffline);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", markOffline);
      markOffline();
    };
  }, [firebaseUser?.uid, firebaseUser?.displayName, userData?.email, userData?.name, currentFocus]);

  useEffect(() => {
    const docId = `${firebaseUser?.uid}_${currentSessionId}`;
    if (!firebaseUser?.uid || document.visibilityState !== 'visible') return;
    
    const timeoutId = setTimeout(() => {
      updateDoc(doc(db, "presence", docId), {
        focus: currentFocus,
        lastSeen: serverTimestamp()
      }).catch(() => {});
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [currentFocus, firebaseUser?.uid]);
};

export const usePresenceListener = () => {
  const dispatch = useAppDispatch();
  const { firebaseUser } = useAppSelector((state) => state.auth);
  const userUid = firebaseUser?.uid;
  const latestDocs = useRef<DocumentData[]>([]);

  useEffect(() => {
    if (!userUid) return;

    let unsubscribe: (() => void) | null = null;
    const q = query(collection(db, "presence"));

    const processSnapshot = (dataArray: DocumentData[]) => {
      const now = Date.now();
      const threshold = now - PRESENCE_THRESHOLD;
      const users: PresenceUser[] = [];

      dataArray.forEach((data) => {
        if (!data || !data.name) return;
        const lastSeenMillis = data.lastSeen?.toMillis?.() || data.lastSeen?.seconds * 1000 || now;

        if (lastSeenMillis > threshold) {
          users.push({
            uid: data.uid,
            userUid: String(data.userUid || ""),
            name: String(data.name),
            email: String(data.email || ""),
            color: String(data.color || "#5c4eb1"),
            lastSeen: lastSeenMillis,
            focus: data.focus || null,
          });
        }
      });
      
      dispatch(setOnlineUsers(users.sort((a, b) => a.name.localeCompare(b.name))));
    };
    
    const timeoutId = setTimeout(() => {
      unsubscribe = onSnapshot(q, {
        next: (snapshot: QuerySnapshot<DocumentData>) => {
          const docs = snapshot.docs.map(d => d.data());
          latestDocs.current = docs;
          processSnapshot(docs);
        },
        error: (err) => {
          console.error("[Presence] Listener failed:", err.message);
          dispatch(setPresenceError(err.message));
        }
      });
    }, 1000);

    const pruningInterval = setInterval(() => {
      processSnapshot(latestDocs.current);
    }, 30000);

    return () => {
      clearTimeout(timeoutId);
      if (unsubscribe) unsubscribe();
      clearInterval(pruningInterval);
    };
  }, [dispatch, userUid]);
};

export const useOnlineUsers = () => {
  return useAppSelector((state) => state.presence.onlineUsers);
};
