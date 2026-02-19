import { useEffect } from "react";

import { useLocation, useNavigate, useParams, Outlet } from "react-router-dom";

import MobileHeader from "./Mobile-Header";
import {
  BOTTOM_NAV_ITEMS,
  AppTab,
  SettingsSection,
} from "../../constants/navigation";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { useAppListeners } from "../../hooks/useAppListeners";
import { setLastVisitedPath } from "../../store/slices/uiSlice";
import ConfirmModal from "../common/ConfirmModal";
import BottomNav from "../navigation/BottomNav";
import SideNav from "../navigation/SideNav";

import styles from "./main-layout.module.css";

const MainLayout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const { userData } = useAppSelector((state) => state.auth);

  // Initialize all real-time app listeners (Presence, Roster, Profile, Metadata)
  useAppListeners();

  const { teams: allTeams } = useAppSelector((state) => state.teams);
  const { isMobileSidebarOpen, isDesktopSidebarExpanded, lastVisitedPaths } =
    useAppSelector((state) => state.ui);

  const activeTab = location.pathname.includes("/settings")
    ? AppTab.SETTINGS
    : location.pathname.includes("/dashboard")
      ? AppTab.DASHBOARD
      : AppTab.ROSTER;
  const { teamName: activeTeamName, positionName, section } = params;
  const activeSideItem = positionName || section || null;

  const hasSideNav = activeTab !== AppTab.DASHBOARD;

  useEffect(() => {
    // Only track if we are within the app sub-pages and not just the base /app path
    const isBaseRoster = activeTab === AppTab.ROSTER && !activeTeamName;
    const isBaseSettings = activeTab === AppTab.SETTINGS && !activeSideItem;

    if (
      location.pathname.startsWith("/app/") &&
      !isBaseRoster &&
      !isBaseSettings &&
      activeTab !== AppTab.DASHBOARD
    ) {
      const fullPath = location.pathname + location.search;
      dispatch(setLastVisitedPath({ tabId: activeTab, path: fullPath }));
    }
  }, [
    location.pathname,
    location.search,
    activeTab,
    activeTeamName,
    activeSideItem,
    dispatch,
  ]);

  useEffect(() => {
    const isBaseApp =
      location.pathname === "/app" || location.pathname === "/app/";
    const isBaseRoster = activeTab === AppTab.ROSTER && !activeTeamName;
    const isBaseSettings = activeTab === AppTab.SETTINGS && !activeSideItem;

    if (isBaseApp) {
      navigate(lastVisitedPaths[AppTab.DASHBOARD] || "/app/dashboard", {
        replace: true,
      });
    } else if (isBaseRoster) {
      const savedPath = lastVisitedPaths[AppTab.ROSTER];
      if (savedPath) {
        navigate(savedPath, { replace: true });
      } else if (userData?.teams?.[0] && allTeams.length > 0) {
        const team = allTeams.find((t) => t.name === userData.teams[0]);
        if (team) {
          navigate(`/app/roster/${team.name}/All`, {
            replace: true,
          });
        }
      }
    } else if (isBaseSettings) {
      const savedPath = lastVisitedPaths[AppTab.SETTINGS];
      navigate(savedPath || `/app/settings/${SettingsSection.PROFILE}`, {
        replace: true,
      });
    }
  }, [
    activeTab,
    activeTeamName,
    activeSideItem,
    userData,
    allTeams,
    navigate,
    location.pathname,
    location.search,
    lastVisitedPaths,
  ]);

  const getHeaderTitle = () => {
    const currentTabInfo = BOTTOM_NAV_ITEMS.find(
      (item) => item.id === activeTab,
    );
    const tabLabel = currentTabInfo ? currentTabInfo.label : "GIG ROSTER";

    if (activeTeamName && activeSideItem) {
      return `${activeTeamName} • ${activeSideItem}`;
    }
    if (activeTeamName) {
      return activeTeamName;
    }
    return activeSideItem ? `${tabLabel} • ${activeSideItem}` : tabLabel;
  };

  return (
    <div
      className={`${styles.layoutWrapper} ${isMobileSidebarOpen ? styles.menuOpen : ""} ${!isDesktopSidebarExpanded ? styles.sidebarCollapsed : styles.sidebarExpanded}`}
    >
      {hasSideNav && <SideNav />}

      <div className={styles.innerWrapper}>
        <MobileHeader title={getHeaderTitle()} hasSideNav={hasSideNav} />

        <main className={styles.mainContent}>
          <Outlet />
        </main>

        <BottomNav />
      </div>
      <ConfirmModal />
    </div>
  );
};

export default MainLayout;
