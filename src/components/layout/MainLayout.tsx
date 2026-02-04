import { useState } from "react";

import BottomNav from "../navigation/BottomNav";
import SideNav from "../navigation/SideNav";

import "./main-layout.css";

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedPosition: string | null;
  onPositionChange: (pos: string) => void;
}

const MainLayout = ({
  children,
  activeTab,
  onTabChange,
  selectedPosition,
  onPositionChange,
}: MainLayoutProps) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <button onClick={() => setSidebarOpen(true)} className="menu-trigger">
          ☰
        </button>
        <h1 className="logo">GIG ROSTER</h1>
        <div className="header-spacer" />
      </header>

      <SideNav
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        selectedPosition={selectedPosition}
        onPositionChange={onPositionChange}
      />

      <main className="main-content">{children}</main>

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
};

export default MainLayout;
