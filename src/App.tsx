import { useState, useCallback } from "react";

import { useAuth } from "./hooks/useAuth";

import MainLayout from "./components/layout/MainLayout";
import { AppTab, SettingsSection } from "./constants/navigation";
import GuestPage from "./page/guest-page/GuestPage";
import Loader from "./page/loading-page/LoadingPage";
import LoginPage from "./page/login-page/LoginPage";
import RosterPage from "./page/roster-page/RosterPage";
import SettingsPage from "./page/settings-page/SettingsPage";

import "./App.css";

const App = () => {
  const { user, userData, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(AppTab.ROSTER);
  const [activeSideItem, setActiveSideItem] = useState<string | null>(null);
  const [activeTeamName, setActiveTeamName] = useState<string | null>(null);

  const handleActiveSelectionChange = useCallback(
    (teamName: string | null, positionName: string | null) => {
      setActiveTeamName(teamName);
      setActiveSideItem(positionName);
    },
    [],
  );

  if (loading) return <Loader />;
  if (!user) return <LoginPage />;
  if (!userData) return <Loader />;

  if (userData && !userData.isApproved) {
    return <GuestPage user={userData} uid={user.uid} />;
  }

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={(tab) => {
        if (tab !== activeTab) {
          setActiveTab(tab);
          if (tab === AppTab.SETTINGS) {
            handleActiveSelectionChange(null, SettingsSection.PROFILE);
          } else {
            handleActiveSelectionChange(null, null);
          }
        }
      }}
      activeSideItem={activeSideItem}
      activeTeamName={activeTeamName}
      onActiveSelectionChange={handleActiveSelectionChange}
    >
      {activeTab === AppTab.ROSTER ? (
        <RosterPage
          uid={user.uid}
          activePosition={activeSideItem}
          activeTeamName={activeTeamName}
        />
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
