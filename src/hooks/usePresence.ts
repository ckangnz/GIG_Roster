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
import { useLocation, matchPath } from "react-router-dom";

import { db, auth } from "../firebase";
import { useAppDispatch, useAppSelector } from "./redux";
import { AppUser, Position } from "../model/model";
import { setOnlineUsers, setPresenceError } from "../store/slices/presenceSlice";
import { safeDecode } from "../utils/stringUtils";

export interface PresenceFocus {
  date: string;
  identifier: string; // email or custom label
  teamName: string;
  viewName?: string | null; // "All", "Absence", or PositionName
}

export interface PresenceUser {
  uid: string;
  userUid: string;
  name: string;
  email: string;
  lastSeen: number; 
  color: string;
  colorIndex?: number;
  focus?: PresenceFocus | null;
  location?: string;
}

/**
 * Theme-aware colors for online users.
 * Each entry is a pair: [LightModeColor, DarkModeColor]
 */
export const PRESENCE_COLORS = [
  ["#FF3B30", "#FF453A"], // Red
  ["#FF9500", "#FF9F0A"], // Orange
  ["#FFCC00", "#FFD60A"], // Yellow
  ["#34C759", "#32D74B"], // Green
  ["#00C7BE", "#64D2FF"], // Teal/Cyan
  ["#007AFF", "#0A84FF"], // Blue
  ["#5856D6", "#5E5CE6"], // Indigo
  ["#AF52DE", "#BF5AF2"], // Purple
  ["#FF2D55", "#FF375F"], // Pink
  ["#A2845E", "#AC8E68"], // Brown
  ["#555555", "#8E8E93"], // Gray
  ["#0040DD", "#409CFF"], // Deep Blue
  ["#107C10", "#28CD41"], // Deep Green
  ["#D83B01", "#FF5722"], // Deep Orange
  ["#A4262C", "#FF5252"], // Deep Red
  ["#0078D4", "#2196F3"], // Bright Blue
  ["#498205", "#8BC34A"], // Lime
  ["#8764B8", "#B388FF"], // Lavender
  ["#00B7C3", "#00E5FF"], // Turquoise
  ["#E3008C", "#F06292"]  // Magenta
];

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

const getSessionColorIndex = () => {
  try {
    const key = 'gig_roster_session_color_index';
    let indexStr = sessionStorage.getItem(key);
    if (indexStr === null) {
      const randomIndex = Math.floor(Math.random() * PRESENCE_COLORS.length);
      indexStr = String(randomIndex);
      sessionStorage.setItem(key, indexStr);
    }
    return parseInt(indexStr, 10);
  } catch {
    return 0;
  }
};

export const currentSessionId = getSessionId();
const sessionColorIndex = getSessionColorIndex();
const sessionColor = PRESENCE_COLORS[sessionColorIndex][0];

const HEARTBEAT_INTERVAL = 60000;
const PRESENCE_THRESHOLD = 90000;

export const useTrackPresence = (firebaseUser: User | null, userData: AppUser | null) => {
  const hasCleanedUp = useRef(false);
  const location = useLocation();
  
  const { focusedCell } = useAppSelector(state => state.ui);
  const { rosterDates, users, allTeamUsers } = useAppSelector(state => state.rosterView);
  const { positions: allPositions } = useAppSelector(state => state.positions);
  
  const currentFocus: PresenceFocus | null = useMemo(() => {
    const rosterFullMatch = matchPath("/app/roster/:teamName/:positionName", location.pathname);
    const rosterTeamMatch = matchPath("/app/roster/:teamName", location.pathname);
    const thoughtsFullMatch = matchPath("/app/thoughts/:teamName", location.pathname);
    
    const rawTeamName = rosterFullMatch?.params.teamName || 
                        rosterTeamMatch?.params.teamName || 
                        thoughtsFullMatch?.params.teamName;
                     
    const rawActivePosition = rosterFullMatch?.params.positionName;

    if (!rawTeamName) return null;

    const teamName = safeDecode(rawTeamName).trim();
    const activePosition = rawActivePosition ? safeDecode(rawActivePosition).trim() : undefined;

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
      viewName: activePosition || null // Use null instead of undefined for Firestore compatibility
    };
  }, [focusedCell, rosterDates, users, allTeamUsers, allPositions, location.pathname]);

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
          colorIndex: sessionColorIndex,
          lastSeen: serverTimestamp(),
          focus: focusData,
          location: location.pathname,
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
    
    const heartbeat = setInterval(() => markOnline(), HEARTBEAT_INTERVAL);

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
  }, [firebaseUser?.uid, firebaseUser?.displayName, userData?.email, userData?.name, currentFocus, location.pathname]);

  useEffect(() => {
    const docId = `${firebaseUser?.uid}_${currentSessionId}`;
    if (!firebaseUser?.uid || document.visibilityState !== 'visible') return;
    
    const timeoutId = setTimeout(() => {
      updateDoc(doc(db, "presence", docId), {
        focus: currentFocus,
        location: location.pathname,
        lastSeen: serverTimestamp()
      }).catch(() => {});
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [currentFocus, location.pathname, firebaseUser?.uid]);
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
            colorIndex: typeof data.colorIndex === 'number' ? data.colorIndex : undefined,
            lastSeen: lastSeenMillis,
            focus: data.focus || null,
            location: data.location || "",
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
