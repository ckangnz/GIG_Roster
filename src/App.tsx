import { useState } from "react";

import { useAuth } from "./hooks/useAuth";

import MainLayout from "./components/layout/MainLayout";
import GuestPage from "./page/guest-page/GuestPage";
import Loader from "./page/loading-page/LoadingPage";
import LoginPage from "./page/login-page/LoginPage";
import "./App.css";

const App = () => {
  const { user, userData, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("roster");
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  if (loading) return <Loader />;
  if (!user) return <LoginPage />;
  if (userData && !userData.isApproved)
    return <GuestPage user={userData} uid={user.uid} />;

  return (
    <MainLayout
      user={userData!}
      activeTab={currentPage}
      onTabChange={setCurrentPage}
      selectedPosition={selectedPosition}
      onPositionChange={setSelectedPosition}
    >
      {currentPage === "roster" && (
        <div className="roster-view">
          <header className="view-header">
            <h2>{selectedPosition} Roster</h2>
          </header>
          <div className="table-placeholder">
            Table for {selectedPosition} coming soon...
          </div>
        </div>
      )}

      {currentPage === "settings" && <div>Settings Page</div>}
    </MainLayout>
  );
};

export default App;
