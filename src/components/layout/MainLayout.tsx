import { useEffect } from "react";

import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, Outlet, matchPath } from "react-router-dom";

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
import UndoToast from "../common/UndoToast";
import BottomNav from "../navigation/BottomNav";
import SideNav from "../navigation/SideNav";

import styles from "./main-layout.module.css";

const safeDecode = (str: string | undefined) => {
  if (!str) return "";
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
};

const MainLayout = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { userData } = useAppSelector((state) => state.auth);

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

  const { teams: allTeams, fetched: teamsFetched } = useAppSelector((state) => state.teams);
  const { positions: allPositions, fetched: positionsFetched } = useAppSelector((state) => state.positions);
  const { isMobileSidebarOpen, isDesktopSidebarExpanded, lastVisitedPaths } =
    useAppSelector((state) => state.ui);

  const rosterFullMatch = matchPath("/app/roster/:teamName/:positionName", location.pathname);
  const rosterTeamMatch = matchPath("/app/roster/:teamName", location.pathname);
  const thoughtsFullMatch = matchPath("/app/thoughts/:teamName", location.pathname);
  const settingsFullMatch = matchPath("/app/settings/:section", location.pathname);

  const activeTeamName = safeDecode(
    rosterFullMatch?.params.teamName || 
    rosterTeamMatch?.params.teamName || 
    thoughtsFullMatch?.params.teamName || 
    ""
  ).trim() || undefined;
                         
  const activeSideItem = safeDecode(
    rosterFullMatch?.params.positionName || 
    settingsFullMatch?.params.section || 
    ""
  ).trim() || null;

  const activeTab: AppTab = location.pathname.includes("/settings")
    ? AppTab.SETTINGS
    : location.pathname.includes("/thoughts")
      ? AppTab.THOUGHTS
      : location.pathname.includes("/dashboard")
        ? AppTab.DASHBOARD
        : AppTab.ROSTER;

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

  const getHeaderTitle = () => {
    const currentTabInfo = BOTTOM_NAV_ITEMS.find(
      (item) => item.id === activeTab,
    );
    const tabLabel = currentTabInfo ? t(`nav.${currentTabInfo.id.toLowerCase()}`, { defaultValue: currentTabInfo.label }) : "GIG ROSTER";

    // Resolve display names from IDs/Identifiers
    const foundTeam = allTeams.find(t => t.id === activeTeamName || t.name === activeTeamName);
    const foundPos = allPositions.find(p => p.id === activeSideItem || p.name === activeSideItem);

    // If metadata isn't fetched yet and the param looks like an ID, show Loading
    const isTeamId = activeTeamName?.includes("-");
    const isPosId = activeSideItem?.includes("-");

    if ((isTeamId && !teamsFetched) || (isPosId && !positionsFetched)) {
      return `${tabLabel} • ${t('common.loading')}`;
    }

    const resolvedTeamName = foundTeam?.name || activeTeamName;
    const resolvedSideItem = activeSideItem === "All" ? t('nav.all') : (foundPos?.name || activeSideItem);

    if (activeTab === AppTab.THOUGHTS && resolvedTeamName) {
      return `${tabLabel} • ${resolvedTeamName}`;
    }

    if (resolvedTeamName && resolvedSideItem) {
      // Resolve Settings Section label if needed
      let sideLabel = resolvedSideItem;
      if (activeTab === AppTab.SETTINGS && activeSideItem) {
        // Try all-lowercase and underscore versions for the key
        const key = activeSideItem.toLowerCase().replace(/-/g, '_');
        sideLabel = t(`settings.${key}`, { defaultValue: resolvedSideItem });
      }
      return `${resolvedTeamName} • ${sideLabel}`;
    }
    if (resolvedTeamName) {
      return resolvedTeamName;
    }
    
    let sideLabel = resolvedSideItem;
    if (activeTab === AppTab.SETTINGS && activeSideItem) {
      // Map old/mismatched IDs to the new underscore-based keys
      const keyMap: Record<string, string> = {
        "Users": "user_management",
        "Positions": "position_management",
        "Teams": "team_management",
        "Profile": "profile"
      };
      const normalizedKey = keyMap[activeSideItem] || activeSideItem.toLowerCase().replace(/-/g, '_');
      sideLabel = t(`settings.${normalizedKey}`, { defaultValue: resolvedSideItem });
    }

    return sideLabel ? `${tabLabel} • ${sideLabel}` : tabLabel;
  };

  return (
    <div
      className={`${styles.layoutWrapper} ${isMobileSidebarOpen ? styles.menuOpen : ""} ${!isDesktopSidebarExpanded ? styles.sidebarCollapsed : styles.sidebarExpanded}`}
    >
      <SideNav isVisible={hasSideNav} />

      <div className={styles.innerWrapper}>
        <MobileHeader 
          key={activeTab} 
          title={getHeaderTitle()} 
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
