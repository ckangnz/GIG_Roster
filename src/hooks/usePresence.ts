import { useEffect, useState } from "react";

import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  Timestamp,
  serverTimestamp 
} from "firebase/firestore";

import { db } from "../firebase";
import { AppUser } from "../model/model";

export interface PresenceUser {
  uid: string;
  name: string;
  email: string;
  lastSeen: Timestamp;
}

/**
 * Hook to track current user's presence globally.
 * Should be called once at a high level (e.g., MainLayout).
 */
export const useTrackPresence = (currentUser: AppUser | null) => {
  useEffect(() => {
    if (!currentUser || !currentUser.email) return;

    const userRef = doc(db, "presence", currentUser.email);
    
    const markOnline = async () => {
      await setDoc(userRef, {
        uid: currentUser.email,
        name: currentUser.name || "Anonymous",
        email: currentUser.email,
        // We still store teams to help with filtering if needed, 
        // but the record exists regardless of current page.
        teams: currentUser.teams || [],
        lastSeen: serverTimestamp(),
      });
    };

    markOnline();

    const heartbeat = setInterval(() => {
      markOnline();
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      deleteDoc(userRef);
    };
  }, [currentUser]);
};

/**
 * Hook to listen to online users for a specific team.
 */
export const useOnlineUsers = (teamName: string | undefined, currentUserEmail: string | null | undefined) => {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    // If no teamName, we can either show NO ONE or show everyone online.
    // The user said "OnlineIndicator is loaded only on roster page. It should be loaded on page load"
    // This might mean they want to see WHO is online globally when not on a team page?
    // Let's support showing global online users if teamName is undefined.
    
    const now = Date.now();
    const twoMinutesAgo = now - 120000;

    const q = teamName 
      ? query(collection(db, "presence"), where("teams", "array-contains", teamName))
      : query(collection(db, "presence"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: PresenceUser[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        let lastSeenDate: Date;
        
        if (!data.lastSeen) {
          lastSeenDate = new Date();
        } else {
          lastSeenDate = data.lastSeen.toDate();
        }

        if (lastSeenDate.getTime() > twoMinutesAgo) {
          users.push({
            uid: data.uid,
            name: data.name,
            email: data.email,
            lastSeen: data.lastSeen,
          });
        }
      });
      
      setOnlineUsers(users.sort((a, b) => {
        if (a.email === currentUserEmail) return -1;
        if (b.email === currentUserEmail) return 1;
        return a.name.localeCompare(b.name);
      }));
    });

    return () => unsubscribe();
  }, [teamName, currentUserEmail]);

  return onlineUsers;
};
