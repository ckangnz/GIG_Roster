import { useState } from "react";
import { useAuth } from "./hooks/useAuth";

import MainLayout from "./components/layout/MainLayout";
import GuestPage from "./page/guest-page/GuestPage";
import Loader from "./page/loading-page/LoadingPage";
import LoginPage from "./page/login-page/LoginPage";
import SettingsPage from "./page/settings-page/SettingsPage";
import { AppTab, SettingsSection } from "./constants/navigation";

import "./App.css";

const App = () => {
  const { user, userData, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(AppTab.ROSTER);
  const [activeSideItem, setActiveSideItem] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <Loader />;
  if (!user) return <LoginPage />;

  // If user is logged in but not approved, show the Guest/Onboarding page
  if (userData && !userData.isApproved) {
    return <GuestPage user={userData} uid={user.uid} />;
  }

  return (
    <MainLayout
      user={userData!}
      activeTab={activeTab}
      isSidebarOpen={isSidebarOpen}
      setSidebarOpen={setSidebarOpen}
      onTabChange={(tab) => {
        setActiveTab(tab);
        // Default to Profile when switching to Settings tab
        setActiveSideItem(
          tab === AppTab.SETTINGS ? SettingsSection.PROFILE : null,
        );
        setSidebarOpen(false);
      }}
      activeSideItem={activeSideItem}
      onSideItemChange={setActiveSideItem}
    >
      {activeTab === AppTab.ROSTER ? (
        <div className="roster-view">
          <div className="table-placeholder">
            Grid for {activeSideItem || "All Positions"}...
          </div>
        </div>
      ) : (
        <SettingsPage
          userData={userData!}
          uid={user.uid} // THIS WAS MISSING: Passing the Firebase Auth UID
          activeSection={activeSideItem}
        />
      )}
    </MainLayout>
  );
};

export default App;
