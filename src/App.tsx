import { useState } from "react";

import { useAuth } from "./hooks/useAuth";

import MainLayout from "./components/layout/MainLayout";
import GuestPage from "./page/guest-page/GuestPage";
import Loader from "./page/loading-page/LoadingPage";
import LoginPage from "./page/login-page/LoginPage";
import SettingsPage from "./page/settings-page/SettingsPage";

import "./App.css";

const App = () => {
  const { user, userData, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("roster");
  const [activeSideItem, setActiveSideItem] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <Loader />;
  if (!user) return <LoginPage />;
  if (userData && !userData.isApproved)
    return <GuestPage user={userData} uid={user.uid} />;

  return (
    <MainLayout
      user={userData!}
      activeTab={activeTab}
      isSidebarOpen={isSidebarOpen}
      setSidebarOpen={setSidebarOpen}
      onTabChange={(tab) => {
        setActiveTab(tab);
        setActiveSideItem(null);
        setSidebarOpen(true);
      }}
      activeSideItem={activeSideItem}
      onSideItemChange={setActiveSideItem}
    >
      {activeTab === "roster" ? (
        <div className="roster-view">
          <div className="table-placeholder">Grid for {activeSideItem}...</div>
        </div>
      ) : (
        <SettingsPage userData={userData!} activeSection={activeSideItem} />
      )}
    </MainLayout>
  );
};

export default App;
