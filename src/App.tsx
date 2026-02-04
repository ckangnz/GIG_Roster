import { useState, useEffect } from "react";
import { auth, googleProvider, db, appleProvider } from "./firebase";
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

  const loginGoogle = () => signInWithPopup(auth, googleProvider);
  const loginApple = () => signInWithPopup(auth, appleProvider);

  if (loading) return <h1>Loading...</h1>;

  if (!user) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h1>GIG Roster</h1>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <button
            onClick={loginGoogle}
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 20px",
              fontSize: "18px",
              width: "250px",
              backgroundColor: "black",
              color: "white",
            }}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              height="18"
              alt="Google"
            />
            Login with Google
          </button>

          <button
            onClick={loginApple}
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 20px",
              fontSize: "18px",
              width: "250px",
              backgroundColor: "black",
              color: "white",
            }}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
              height="18"
              alt="Apple"
              style={{ filter: "invert(1)" }}
            />
            Login with Apple
          </button>
        </div>
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
