import { useEffect, useRef } from "react";

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
  QuerySnapshot
} from "firebase/firestore";

import { db, auth } from "../firebase";
import { useAppDispatch, useAppSelector } from "./redux";
import { AppUser } from "../model/model";
import { setOnlineUsers, setPresenceError } from "../store/slices/presenceSlice";

export interface PresenceUser {
  uid: string;
  name: string;
  email: string;
  lastSeen: number; 
  color: string;
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

// SETTINGS FOR FREE TIER
const HEARTBEAT_INTERVAL = 60000; // 1 minute (Very cheap)
const PRESENCE_THRESHOLD = 90000; // 1.5 minutes

export const useTrackPresence = (firebaseUser: User | null, userData: AppUser | null) => {
  const hasCleanedUp = useRef(false);

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

    const markOnline = async () => {
      if (!auth.currentUser || document.visibilityState !== 'visible') return;
      try {
        await setDoc(userRef, {
          uid: docId,
          userUid: firebaseUser.uid,
          name: userData.name || firebaseUser.displayName || "Anonymous",
          email: userData.email,
          color: sessionColor,
          lastSeen: serverTimestamp(),
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

    // 1. Initial mark
    markOnline();
    
    // 2. Periodic heartbeat
    const heartbeat = setInterval(markOnline, HEARTBEAT_INTERVAL);

    // 3. Visibility Optimization: 
    // Go "Offline" if tab is hidden, come back "Online" when clicked.
    // This saves a huge amount of writes for users who leave tabs open.
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
  }, [firebaseUser?.uid, firebaseUser?.displayName, userData?.email, userData?.name]);
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
            name: String(data.name),
            email: String(data.email || ""),
            color: String(data.color || "#5c4eb1"),
            lastSeen: lastSeenMillis,
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
