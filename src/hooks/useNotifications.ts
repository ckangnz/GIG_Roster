import { useEffect, useCallback } from "react";

import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";

import { messaging, db } from "../firebase";
import { useAppSelector } from "./redux";

export const useNotifications = () => {
  const { firebaseUser, userData } = useAppSelector((state) => state.auth);

  const requestPermission = useCallback(async () => {
    if (!messaging || !firebaseUser) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        });

        if (token) {
          // Add token to user document
          const userRef = doc(db, "users", firebaseUser.uid);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token),
          });
          console.log("FCM Token registered");
        }
      }
    } catch (err) {
      console.error("Notification permission error:", err);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (messaging && firebaseUser && userData?.notificationPrefs?.all !== false) {
      // Listen for foreground messages - just log to console, no OS banner
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("Foreground message received (silenced):", payload);
      });

      return () => unsubscribe();
    }
  }, [firebaseUser, userData?.notificationPrefs?.all]);

  return { requestPermission };
};
