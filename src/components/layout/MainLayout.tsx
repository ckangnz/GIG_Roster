import React, { useState, useEffect } from "react";

import MobileHeader from "./Mobile-Header";
import { BOTTOM_NAV_ITEMS } from "../../constants/navigation";
import BottomNav from "../navigation/BottomNav";
import SideNav from "../navigation/SideNav";

import "./main-layout.css";

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  activeSideItem: string | null;
  activeTeamName: string | null;
  onActiveSelectionChange: (
    teamName: string | null,
    positionName: string | null,
  ) => void;
}

const MainLayout = ({
  children,
  activeTab,
  onTabChange,
  activeSideItem,
  activeTeamName,
  onActiveSelectionChange,
}: MainLayoutProps) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] =
    useState(true);

  useEffect(() => {
    const handleResize = () => {};
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getHeaderTitle = () => {
    const currentTab = BOTTOM_NAV_ITEMS.find((item) => item.id === activeTab);
    const tabLabel = currentTab ? currentTab.label : "GIG ROSTER";

    if (activeTeamName && activeSideItem) {
      return `${activeTeamName} • ${activeSideItem}`;
    } else if (activeTeamName) {
      return activeTeamName;
    }
    return activeSideItem ? `${tabLabel} • ${activeSideItem}` : tabLabel;
  };

  const appShellClasses = [
    "app-shell",
    window.innerWidth < 768 && isSidebarOpen ? "menu-open" : "",
    window.innerWidth >= 768 && !isDesktopSidebarExpanded
      ? "sidebar-collapsed"
      : "",
    window.innerWidth >= 768 && isDesktopSidebarExpanded
      ? "sidebar-expanded"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <MobileHeader
        title={getHeaderTitle()}
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className={appShellClasses}>
        <SideNav
          activeTab={activeTab}
          activeSideItem={activeSideItem}
          isSidebarOpen={isDesktopSidebarExpanded}
          setSidebarOpen={setIsDesktopSidebarExpanded}
          headerTitle={getHeaderTitle()}
          activeTeamName={activeTeamName}
          onActiveSelectionChange={onActiveSelectionChange}
        />

        <main className="main-content">
          <div className="content-container">{children}</div>
        </main>

        <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </>
  );
};

export default MainLayout;
