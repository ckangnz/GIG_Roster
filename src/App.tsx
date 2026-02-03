import { useState, useEffect } from "react";
import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

import "./App.css";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 1. Check if user exists in our Firestore
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserData(userSnap.data());
        } else {
          const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
          const isAutoAdmin = firebaseUser.email === adminEmail;

          const newData = {
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            isApproved: isAutoAdmin,
            isAdmin: isAutoAdmin,
            isActive: true,
            roles: [],
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

  const login = () => signInWithPopup(auth, googleProvider);

  if (loading) return <h1>Loading...</h1>;

  if (!user) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h1>GIG Roster</h1>
        <button
          onClick={login}
          style={{ padding: "10px 20px", fontSize: "18px" }}
        >
          Login with Google
        </button>
      </div>
    );
  }

  // STEP 2: If logged in but NOT approved
  if (userData && !userData.isApproved) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h1>Welcome, {user.displayName}</h1>
        <p style={{ color: "orange", fontWeight: "bold" }}>
          You are a guest. Wait for approval from admin.
        </p>
        <button onClick={() => auth.signOut()}>Logout</button>
      </div>
    );
  }

  // STEP 3: Approved User - Show App
  return (
    <div style={{ padding: "20px" }}>
      <h1>GIG Roster Main App</h1>
      <p>Welcome back, {userData.name}!</p>
      {/* Roster components will go here later */}
      <button onClick={() => auth.signOut()}>Logout</button>
    </div>
  );
}

export default App;
