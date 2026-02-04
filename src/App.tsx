import { useState } from "react";

import { useAuth } from "./hooks/useAuth";
import GuestPage from "./page/guest-page/GuestPage";
import Loader from "./page/loading-page/LoadingPage";
import LoginPage from "./page/login-page/LoginPage";
import "./App.css";

function App() {
  const { user, userData, loading } = useAuth();
  const needsApproval = userData && !userData.isApproved;

  if (loading) return <Loader />;
  if (!user) return <LoginPage />;

  if (needsApproval) {
    return <GuestPage user={userData!} uid={user.uid} />;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>GIG Roster Main App</h1>
      <p>Welcome back, {userData?.name}!</p>
      <button onClick={() => auth.signOut()}>Logout</button>
    </div>
  );
}

export default App;
