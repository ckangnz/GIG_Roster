import { useEffect } from "react";

import { useLocation, useNavigate, Outlet } from "react-router-dom";

import MobileHeader from "./Mobile-Header";
import { AppTab, SettingsSection } from "../../constants/navigation";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { useAppListeners } from "../../hooks/useAppListeners";
import { useHeaderTitle } from "../../hooks/useHeaderTitle";
import { selectUserData } from "../../store/slices/authSlice";
import { setLastVisitedPath } from "../../store/slices/uiSlice";
import ConfirmModal from "../common/ConfirmModal";
import UndoToast from "../common/UndoToast";
import BottomNav from "../navigation/BottomNav";
import SideNav from "../navigation/SideNav";

import styles from "./main-layout.module.css";

const MainLayout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { headerTitle, activeTab, activeTeamName, activeSideItem } =
    useHeaderTitle();

  const userData = useAppSelector(selectUserData);

  // Dynamic Gender Theme Sync
  useEffect(() => {
    if (userData?.gender) {
      document.documentElement.setAttribute("data-gender", userData.gender);
    } else {
      document.documentElement.removeAttribute("data-gender");
    }
  }, [userData?.gender]);

  // Initialize all real-time app listeners (Presence, Roster, Profile, Metadata)
  useAppListeners();

  const { teams: allTeams } = useAppSelector((state) => state.teams);
  const { isMobileSidebarOpen, isDesktopSidebarExpanded, lastVisitedPaths } =
    useAppSelector((state) => state.ui);

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
        const teamId = userData.teams[0];
        const team = allTeams.find((t) => t.id === teamId || t.name === teamId);
        if (team) {
          navigate(`/app/roster/${team.id}/All`, {
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

  return (
    <div
      className={`${styles.layoutWrapper} ${isMobileSidebarOpen ? styles.menuOpen : ""} ${!isDesktopSidebarExpanded ? styles.sidebarCollapsed : styles.sidebarExpanded}`}
    >
      <SideNav isVisible={hasSideNav} />

      <div className={styles.innerWrapper}>
        <MobileHeader
          key={activeTab}
          title={headerTitle}
          hasSideNav={hasSideNav}
        />

        <main className={styles.mainContent}>
          <Outlet />
        </main>

        <BottomNav />
      </div>
      <UndoToast />
      <ConfirmModal />
    </div>
  );
};

export default MainLayout;
