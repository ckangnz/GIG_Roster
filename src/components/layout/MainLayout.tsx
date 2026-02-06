import React, { useCallback, useState, useEffect } from "react";

import { Sun, Moon } from "lucide-react";

import { BOTTOM_NAV_ITEMS } from "../../constants/navigation";
import { useTheme } from "../../hooks/useThemeHook";
import { AppUser } from "../../model/model";
import BottomNav from "../navigation/BottomNav";
import SideNav from "../navigation/SideNav";

import "./main-layout.css";

interface MainLayoutProps {
  user: AppUser;
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  activeSideItem: string | null;
  onSideItemChange: (item: string) => void;
  isSidebarOpen: boolean; // This is for mobile, passed from parent
  setSidebarOpen: (open: boolean) => void; // This is for mobile, passed from parent
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
  const { theme, toggleTheme } = useTheme();
  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(true); // New state for desktop

  // Handle sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      // Remove automatic re-expansion on desktop resize, allow user control
      // if (window.innerWidth >= 768) {
      //   setIsDesktopSidebarExpanded(true);
      // }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Set initial state
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  const getHeaderTitle = () => {
    const currentTab = BOTTOM_NAV_ITEMS.find((item) => item.id === activeTab);
    const tabLabel = currentTab ? currentTab.label : "GIG ROSTER";
    return activeSideItem ? `${tabLabel} • ${activeSideItem}` : tabLabel;
  };

  const handleSideItemChange = useCallback((item: string, isManual: boolean) => {
    onSideItemChange(item);
    if (isManual && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [onSideItemChange, setSidebarOpen]);

  // Determine the main class for app-shell
  const appShellClasses = [
    "app-shell",
    window.innerWidth < 768 && isSidebarOpen ? "menu-open" : "", // Mobile sidebar open
    window.innerWidth >= 768 && !isDesktopSidebarExpanded ? "sidebar-collapsed" : "", // Desktop sidebar collapsed
    window.innerWidth >= 768 && isDesktopSidebarExpanded ? "sidebar-expanded" : "", // Desktop sidebar expanded
  ].filter(Boolean).join(" ");


  return (
    <div className={appShellClasses}>
      <header className="mobile-header">
        <div
          className={`header-pill ${isSidebarOpen ? "pill-active" : ""}`}
          onClick={() => setSidebarOpen(!isSidebarOpen)}
        >
          <span className="current-context">{getHeaderTitle()}</span>
          <svg
            className={`chevron-icon ${isSidebarOpen ? "rotate" : ""}`}
            viewBox="0 0 24 24"
            width="20"
            height="20"
          >
            <path
              d="M7 10l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <button className="theme-toggle-button" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      <SideNav
        user={user}
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
  );
};

export default MainLayout;
