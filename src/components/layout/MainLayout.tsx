import React, { useCallback, useState, useEffect } from "react";

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
  onSideItemChange: (item: string) => void;
  isSidebarOpen: boolean; // This is for mobile, passed from parent
  setSidebarOpen: (open: boolean) => void; // This is for mobile, passed from parent
}

const MainLayout = ({
  children,
  activeTab,
  onTabChange,
  activeSideItem,
  onSideItemChange,
  isSidebarOpen,
  setSidebarOpen,
}: MainLayoutProps) => {
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
    return activeSideItem ? `${tabLabel} • ${activeSideItem}` : tabLabel;
  };

  const handleSideItemChange = useCallback(
    (item: string, isManual: boolean) => {
      onSideItemChange(item);
      if (isManual && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    },
    [onSideItemChange, setSidebarOpen],
  );

  // Determine the main class for app-shell
  const appShellClasses = [
    "app-shell",
    window.innerWidth < 768 && isSidebarOpen ? "menu-open" : "", // Mobile sidebar open
    window.innerWidth >= 768 && !isDesktopSidebarExpanded
      ? "sidebar-collapsed"
      : "", // Desktop sidebar collapsed
    window.innerWidth >= 768 && isDesktopSidebarExpanded
      ? "sidebar-expanded"
      : "", // Desktop sidebar expanded
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
          onSideItemChange={handleSideItemChange}
          isSidebarOpen={isDesktopSidebarExpanded} // Pass desktop state to SideNav
          setSidebarOpen={setIsDesktopSidebarExpanded} // Pass desktop setter to SideNav
          headerTitle={getHeaderTitle()} // Pass the generated title
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
