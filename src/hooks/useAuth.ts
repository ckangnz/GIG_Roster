import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { AppUser } from "../model/model";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserData(userSnap.data() as AppUser);
        } else {
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
          setUserData(newData);
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, userData, loading };
};
