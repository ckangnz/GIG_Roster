import { useState } from "react";

import { useAuth } from "./hooks/useAuth";

import MainLayout from "./components/layout/MainLayout";
import { AppTab, SettingsSection } from "./constants/navigation";
import GuestPage from "./page/guest-page/GuestPage";
import Loader from "./page/loading-page/LoadingPage";
import LoginPage from "./page/login-page/LoginPage";
import SettingsPage from "./page/settings-page/SettingsPage";

import "./App.css";

const App = () => {
  const { user, userData, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(AppTab.ROSTER);
  const [activeSideItem, setActiveSideItem] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <Loader />;
  if (!user) return <LoginPage />;
  if (!userData) return <Loader />;

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
        //setSidebarOpen(true);

        if (tab !== activeTab) {
          setActiveTab(tab);
          if (tab === AppTab.SETTINGS) {
            setActiveSideItem(SettingsSection.PROFILE);
          } else {
            setActiveSideItem(null);
          }
        }
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
          uid={user.uid}
          activeSection={activeSideItem}
        />
      )}
    </MainLayout>
  );
};

export default App;
