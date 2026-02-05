import { useState, useEffect } from "react";

import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore"; // Added onSnapshot

import { auth, db } from "../firebase";
import { AppUser } from "../model/model";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userRef = doc(db, "users", firebaseUser.uid);

        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
          const isAutoAdmin = firebaseUser.email === adminEmail;

          const newData: AppUser = {
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            isApproved: isAutoAdmin,
            isAdmin: isAutoAdmin,
            isActive: true,
            positions: [],
            gender: "",
          };
          await setDoc(userRef, newData);
        }

        unsubscribeSnapshot = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data() as AppUser);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  return { user, userData, loading };
};
