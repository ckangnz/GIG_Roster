import { useEffect } from "react";

import { useLocation, useNavigate, useParams, Outlet } from "react-router-dom";

import MobileHeader from "./Mobile-Header";
import {
  BOTTOM_NAV_ITEMS,
  AppTab,
  SettingsSection,
} from "../../constants/navigation";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { setLastVisitedPath } from "../../store/slices/uiSlice";
import BottomNav from "../navigation/BottomNav";
import SideNav from "../navigation/SideNav";
import "./main-layout.css";

const MainLayout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const { userData } = useAppSelector((state) => state.auth);
  const { teams: allTeams } = useAppSelector((state) => state.teams);
  const { isMobileSidebarOpen, isDesktopSidebarExpanded, lastVisitedPaths } = useAppSelector(
    (state) => state.ui,
  );

  const activeTab = location.pathname.includes('/settings')
    ? AppTab.SETTINGS
    : location.pathname.includes('/dashboard')
      ? AppTab.DASHBOARD
      : AppTab.ROSTER;
  const { teamName: activeTeamName, positionName, section } = params;
  const activeSideItem = positionName || section || null;

  useEffect(() => {
    // Only track if we are within the app sub-pages and not just the base /app path
    if (location.pathname.startsWith('/app/') && location.pathname !== '/app' && location.pathname !== '/app/') {
      const fullPath = location.pathname + location.search;
      dispatch(setLastVisitedPath({ tabId: activeTab, path: fullPath }));
    }
  }, [location.pathname, location.search, activeTab, dispatch]);

  useEffect(() => {
    if (location.pathname === "/app" || location.pathname === "/app/") {
      const savedDashboard = lastVisitedPaths[AppTab.DASHBOARD];
      navigate(savedDashboard || "/app/dashboard", { replace: true });
    } else if (
      activeTab === AppTab.ROSTER &&
      !activeTeamName &&
      !activeSideItem
    ) {
      const savedRoster = lastVisitedPaths[AppTab.ROSTER];
      if (savedRoster) {
        navigate(savedRoster, { replace: true });
      } else if (
        userData?.teams &&
        userData.teams.length > 0 &&
        allTeams.length > 0
      ) {
        const firstTeamName = userData.teams[0];
        const team = allTeams.find((t) => t.name === firstTeamName);
        if (team && team.positions && team.positions.length > 0) {
          navigate(`/app/roster/${team.name}/${team.positions[0].name}`, {
            replace: true,
          });
        }
      }
    } else if (activeTab === AppTab.SETTINGS && !activeSideItem) {
      const savedSettings = lastVisitedPaths[AppTab.SETTINGS];
      navigate(savedSettings || `/app/settings/${SettingsSection.PROFILE}`, {
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

  const appShellClasses = [
    "app-shell",
    isMobileSidebarOpen ? "menu-open" : "",
    !isDesktopSidebarExpanded ? "sidebar-collapsed" : "sidebar-expanded",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <MobileHeader title={getHeaderTitle()} />

      <div className={appShellClasses}>
        <SideNav />

        <main className="main-content">
          <div className="content-container">
            <Outlet />
          </div>
        </main>

        <BottomNav />
      </div>
    </>
  );
};

export default MainLayout;
