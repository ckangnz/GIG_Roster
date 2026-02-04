import { useState } from "react";

import { AppUser } from "../../model/model";
import BottomNav from "../navigation/BottomNav";
import SideNav from "../navigation/SideNav";

import "./main-layout.css";

interface MainLayoutProps {
  user: AppUser;
  children: React.ReactNode;
  activeTab: string; // "roster" or "settings"
  onTabChange: (tab: string) => void;
  activeSideItem: string | null; // e.g., "Leader", "Synth", "Profile", or "Users"
  onSideItemChange: (item: string) => void;
}

const MainLayout = ({
  user,
  children,
  activeTab,
  onTabChange,
  activeSideItem,
  onSideItemChange,
}: MainLayoutProps) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Mobile Top Bar */}
      <header className="mobile-header">
        <button onClick={() => setSidebarOpen(true)} className="menu-trigger">
          ☰
        </button>
        <h1 className="logo">GIG ROSTER</h1>
        <div className="header-spacer" />
      </header>

      {/* Side Navigation - Handles the sub-menu logic */}
      <SideNav
        user={user}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        activeSideItem={activeSideItem}
        onSideItemChange={onSideItemChange}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <div className="content-container">{children}</div>
      </main>

      {/* Bottom Navigation - Handles the primary context switch */}
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
};

export default MainLayout;
