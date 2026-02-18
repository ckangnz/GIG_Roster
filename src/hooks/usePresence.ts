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

export const usePresence = (teamName: string | undefined, currentUser: AppUser | null) => {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!teamName || !currentUser || !currentUser.email) return;

    const userRef = doc(db, "presence", currentUser.email);
    
    // 1. Mark current user as online
    const markOnline = async () => {
      await setDoc(userRef, {
        uid: currentUser.email, // using email as ID for simplicity in this project
        name: currentUser.name || "Anonymous",
        email: currentUser.email,
        team: teamName,
        lastSeen: serverTimestamp(),
      });
    };

    markOnline();

    // 2. Heartbeat to keep status alive
    const heartbeat = setInterval(() => {
      markOnline();
    }, 30000); // every 30 seconds

    // 3. Cleanup on unmount
    return () => {
      clearInterval(heartbeat);
      deleteDoc(userRef);
    };
  }, [teamName, currentUser]);

  useEffect(() => {
    if (!teamName) return;

    // 4. Listen to online users for this team
    // Only users seen in the last 2 minutes
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const q = query(
      collection(db, "presence"),
      where("team", "==", teamName)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: PresenceUser[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Client side filtering for active users (last 60 seconds)
        // Firestore serverTimestamp might take a second to resolve
        if (data.lastSeen) {
          const lastSeenDate = data.lastSeen.toDate();
          if (lastSeenDate > oneMinuteAgo) {
            users.push({
              uid: data.uid,
              name: data.name,
              email: data.email,
              lastSeen: data.lastSeen,
            });
          }
        }
      });
      
      // Sort users: current user first, then by name
      setOnlineUsers(users.sort((a, b) => {
        if (a.email === currentUser?.email) return -1;
        if (b.email === currentUser?.email) return 1;
        return a.name.localeCompare(b.name);
      }));
    });

    return () => unsubscribe();
  }, [teamName, currentUser?.email]);

  return onlineUsers;
};
