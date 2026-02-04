import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

import Loader from "./page/loading-page/LoadingPage";
import LoginPage from "./page/login-page/LoginPage";
import { AppUser } from "./model/model";

import "./App.css";
import GuestPage from "./page/guest-page/GuestPage";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 1. Check if user exists in our Firestore
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

  // Loading...
  if (loading) return <Loader />;

  // Not signed in
  if (!user) return <LoginPage />;

  // Unapproved
  if (userData && !userData.isApproved) {
    return <GuestPage user={userData} uid={user.uid} />;
  }

  // Roster App
  return (
    <div style={{ padding: "20px" }}>
      <h1>GIG Roster Main App</h1>
      <p>Welcome back, {userData!.name}!</p>
      <button onClick={() => auth.signOut()}>Logout</button>
    </div>
  );
}

export default App;
