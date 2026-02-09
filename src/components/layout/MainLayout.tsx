import { useEffect } from "react";

import { useLocation, useNavigate, useParams, Outlet } from "react-router-dom";

import MobileHeader from "./Mobile-Header";
import {
  BOTTOM_NAV_ITEMS,
  AppTab,
  SettingsSection,
} from "../../constants/navigation";
import { useAppSelector } from "../../hooks/redux";
import BottomNav from "../navigation/BottomNav";
import SideNav from "../navigation/SideNav";
import "./main-layout.css";

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const { userData } = useAppSelector((state) => state.auth);
  const { teams: allTeams } = useAppSelector((state) => state.teams);
  const { isMobileSidebarOpen, isDesktopSidebarExpanded } = useAppSelector(
    (state) => state.ui,
  );

  const activeTab = location.pathname.includes("/settings")
    ? AppTab.SETTINGS
    : AppTab.ROSTER;
  const { teamName: activeTeamName, positionName, section } = params;
  const activeSideItem = positionName || section || null;

  useEffect(() => {
    if (activeTab === AppTab.ROSTER && !activeTeamName && !activeSideItem) {
      if (userData?.teams && userData.teams.length > 0 && allTeams.length > 0) {
        const firstTeamName = userData.teams[0];
        const team = allTeams.find((t) => t.name === firstTeamName);
        if (team && team.positions && team.positions.length > 0) {
          navigate(`/app/roster/${team.name}/${team.positions[0].name}`, {
            replace: true,
          });
        }
      }
    } else if (activeTab === AppTab.SETTINGS && !activeSideItem) {
      navigate(`/app/settings/${SettingsSection.PROFILE}`, { replace: true });
    }
  }, [activeTab, activeTeamName, activeSideItem, userData, allTeams, navigate]);

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
