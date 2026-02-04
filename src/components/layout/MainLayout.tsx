import { AppUser } from "../../model/model";
import BottomNav from "../navigation/BottomNav";
import SideNav from "../navigation/SideNav";
import { BOTTOM_NAV_ITEMS, AppTab } from "../../constants/navigation";

import "./main-layout.css";

interface MainLayoutProps {
  user: AppUser;
  children: React.ReactNode;
  activeTab: string; // "roster" or "settings"
  onTabChange: (tab: string) => void;
  activeSideItem: string | null; // e.g., "Leader", "Synth", "Profile", or "Users"
  onSideItemChange: (item: string) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const MainLayout = ({
  user,
  children,
  activeTab,
  onTabChange,
  activeSideItem,
  onSideItemChange,
  isSidebarOpen,
  setSidebarOpen,
}: MainLayoutProps) => {
  const getHeaderTitle = () => {
    if (activeSideItem) return activeSideItem;
    const currentTab = BOTTOM_NAV_ITEMS.find((item) => item.id === activeTab);
    return currentTab ? currentTab.label : "GIG ROSTER";
  };

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <button onClick={() => setSidebarOpen(true)} className="menu-trigger">
          〈
        </button>
        <h1 className="logo">{getHeaderTitle()}</h1>
        <div className="header-spacer" style={{ width: "40px" }} />
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
