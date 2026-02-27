import { useCallback, useEffect, useRef, useState } from "react";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useLocation, useNavigate, matchPath } from "react-router-dom";

import OnlineUsers from "./OnlineUsers";
import {
  BOTTOM_NAV_ITEMS,
  AppTab,
  SETTINGS_NAV_ITEMS,
} from "../../constants/navigation";
import { resolvePresenceColor } from "../../hooks/presenceUtils";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { useTheme } from "../../hooks/useThemeHook";
import { fetchPositions } from "../../store/slices/positionsSlice";
import { fetchTeams } from "../../store/slices/teamsSlice";
import {
  setDesktopSidebarExpanded,
  setMobileSidebarOpen,
  toggleTeamExpansion,
  expandTeam,
} from "../../store/slices/uiSlice";
import ThemeToggleButton from "../common/ThemeToggleButton";

import styles from "./side-nav.module.css";

const safeDecode = (str: string | undefined) => {
  if (!str) return "";
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
};

const SideNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const { userData } = useAppSelector((state) => state.auth);
  const { isDesktopSidebarExpanded, isMobileSidebarOpen, expandedTeams } =
    useAppSelector((state) => state.ui);
  const {
    teams: allTeams,
    fetched: teamsFetched,
    loading: teamsLoading,
  } = useAppSelector((state) => state.teams);
  const { positions: allPositions, fetched: positionsFetched } = useAppSelector(
    (state) => state.positions,
  );
  const { onlineUsers } = useAppSelector((state) => state.presence);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Track window width to force labels on mobile
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth <= 767;
  const shouldShowLabels = isMobile || isDesktopSidebarExpanded;

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
  ).trim() || undefined;

  const activeTab: AppTab = location.pathname.includes("/settings")
    ? AppTab.SETTINGS
    : location.pathname.includes("/thoughts")
      ? AppTab.THOUGHTS
      : location.pathname.includes("/dashboard")
        ? AppTab.DASHBOARD
        : AppTab.ROSTER;

  const prevTeamRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (
      activeTeamName &&
      activeTab === AppTab.ROSTER &&
      activeTeamName !== prevTeamRef.current
    ) {
      dispatch(expandTeam(activeTeamName));
    }
    prevTeamRef.current = activeTeamName;
  }, [activeTeamName, activeTab, dispatch]);

  useEffect(() => {
    if (!teamsFetched) {
      dispatch(fetchTeams());
    }
    if (!positionsFetched) {
      dispatch(fetchPositions());
    }
  }, [dispatch, teamsFetched, positionsFetched]);

  const handleNavItemClick = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate],
  );

  const handleToggleTeamExpansion = (teamName: string) => {
    dispatch(toggleTeamExpansion(teamName));
  };

  const getHeaderTitle = () => {
    const currentTabInfo = BOTTOM_NAV_ITEMS.find(
      (item) => item.id === activeTab,
    );
    const tabLabel = currentTabInfo ? currentTabInfo.label : "GIG ROSTER";

    const resolvedTeamName = allTeams.find(t => t.id === activeTeamName || t.name === activeTeamName)?.name || activeTeamName;
    const resolvedSideItem = allPositions.find(p => p.id === activeSideItem || p.name === activeSideItem)?.name || activeSideItem;

    if (activeTab === AppTab.THOUGHTS && resolvedTeamName) {
      return `${tabLabel} • ${resolvedTeamName}`;
    }

    if (resolvedTeamName && resolvedSideItem) {
      return `${resolvedTeamName} • ${resolvedSideItem}`;
    }
    if (resolvedTeamName) {
      return resolvedTeamName;
    }
    return resolvedSideItem ? `${tabLabel} • ${resolvedSideItem}` : tabLabel;
  };

  const renderLocationIndicators = (teamName: string, viewName?: string) => {
    const usersHere = onlineUsers.filter(
      (u) =>
        u.focus?.teamName?.trim() === teamName.trim() &&
        (viewName ? u.focus?.viewName?.trim() === viewName.trim() : true),
    );

    if (usersHere.length === 0) return null;

    return (
      <div className={styles.locationIndicators}>
        {usersHere.map((u) => (
          <span
            key={u.uid}
            className={styles.locationDot}
            style={{ backgroundColor: resolvePresenceColor(u.colorIndex, u.color, isDark) }}
            title={`${u.name} is in ${u.focus?.viewName || teamName}`}
          />
        ))}
      </div>
    );
  };

  const renderLocationIndicatorsByUrl = (path: string) => {
    const usersHere = onlineUsers.filter((u) => u.location === path);

    if (usersHere.length === 0) return null;

    return (
      <div className={styles.locationIndicators}>
        {usersHere.map((u) => (
          <span
            key={u.uid}
            className={styles.locationDot}
            style={{ backgroundColor: resolvePresenceColor(u.colorIndex, u.color, isDark) }}
            title={`${u.name} is on this page`}
          />
        ))}
      </div>
    );
  };

  const sideNavClasses = [
    styles.sideNav,
    isMobileSidebarOpen ? styles.menuOpen : "",
    !isDesktopSidebarExpanded ? styles.sidebarCollapsed : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={sideNavClasses}>
      <div className={styles.sidebarContent}>
        <div className={styles.tabletSidebarHeader}>
          {shouldShowLabels && <h3>{getHeaderTitle()}</h3>}
          <button
            className={styles.sidebarToggleButton}
            onClick={() =>
              dispatch(setDesktopSidebarExpanded(!isDesktopSidebarExpanded))
            }
            aria-label={
              isDesktopSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"
            }
          >
            {isDesktopSidebarExpanded ? (
              <PanelLeftClose size={20} />
            ) : (
              <PanelLeftOpen size={20} />
            )}
          </button>
        </div>

        <nav className={styles.sideMenuList}>
          {activeTab === AppTab.ROSTER && teamsLoading && (
            <div className={`${styles.sideNavItem} ${styles.loading}`}>
              Loading teams...
            </div>
          )}

          {activeTab === AppTab.ROSTER &&
            userData?.teams?.map((teamIdentifier) => {
              const team = allTeams.find((t) => t.id === teamIdentifier || t.name === teamIdentifier);
              if (!team) return null;

              const hasOneTeam = userData.teams.length === 1;
              const isTeamExpanded =
                hasOneTeam || expandedTeams.includes(team.id);

              return (
                <div key={team.id}>
                  {!hasOneTeam && (
                    <div
                      className={`${styles.sidenavMenuSubheading} ${styles.sidenavMenuSubheadingClickable}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        handleToggleTeamExpansion(team.id);
                        handleNavItemClick(`/app/roster/${team.id}/All`);
                      }}
                    >
                      <div className={styles.teamHeadingContent}>
                        {team.emoji} {shouldShowLabels && team.name}
                      </div>
                      <span className={styles.expandIcon}>
                        {isTeamExpanded ? "▼" : "▶"}
                      </span>
                    </div>
                  )}
                  {isTeamExpanded && (
                    <div className={styles.sideNavSubItems}>
                      <button
                        className={`${styles.sideNavItem} ${styles.sideNavItemSub} ${
                          activeSideItem === "All" &&
                          activeTeamName === team.id
                            ? styles.sideNavItemActive
                            : ""
                        }`}
                        onClick={() => {
                          handleNavItemClick(`/app/roster/${team.id}/All`);
                          dispatch(setMobileSidebarOpen(false));
                        }}
                      >
                        <span className={styles.sideEmoji}>📋</span>
                        <span className={styles.navItemLabel}>
                          {shouldShowLabels && "All"}
                        </span>
                        {renderLocationIndicators(team.id, "All")}
                      </button>
                      {team.positions
                        ?.filter((pos) => !pos.parentId)
                        ?.map((pos) => {
                          const isActive =
                            activeSideItem === pos.id &&
                            activeTeamName === team.id;
                          return (
                            <button
                              key={pos.id}
                              className={`${styles.sideNavItem} ${styles.sideNavItemSub} ${
                                isActive ? styles.sideNavItemActive : ""
                              }`}
                              onClick={() => {
                                handleNavItemClick(
                                  `/app/roster/${team.id}/${pos.id}`,
                                );
                                dispatch(setMobileSidebarOpen(false));
                              }}
                              style={
                                {
                                  "--active-color": pos.colour,
                                  "--active-bg": `${pos.colour}15`,
                                } as React.CSSProperties
                              }
                            >
                              <span className={styles.sideEmoji}>
                                {pos.emoji}
                              </span>
                              <span className={styles.navItemLabel}>
                                {shouldShowLabels && pos.name}
                              </span>
                              {renderLocationIndicators(team.id, pos.id)}
                            </button>
                          );
                        })}
                      {team.allowAbsence !== false && (
                        <button
                          className={`${styles.sideNavItem} ${styles.sideNavItemSub} ${
                            activeSideItem === "Absence" &&
                            activeTeamName === team.id
                              ? styles.sideNavItemActive
                              : ""
                          }`}
                          onClick={() => {
                            handleNavItemClick(
                              `/app/roster/${team.id}/Absence`,
                            );
                            dispatch(setMobileSidebarOpen(false));
                          }}
                          style={
                            {
                              "--active-color": "var(--color-error)",
                              "--active-bg":
                                "var(--background-toggle-off-transparent)",
                            } as React.CSSProperties
                          }
                        >
                          <span className={styles.sideEmoji}>🏥</span>
                          <span className={styles.navItemLabel}>
                            {shouldShowLabels && "Absence"}
                          </span>
                          {renderLocationIndicators(team.id, "Absence")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

          {activeTab === AppTab.THOUGHTS &&
            userData?.teams?.map((teamIdentifier) => {
              const team = allTeams.find((t) => t.id === teamIdentifier || t.name === teamIdentifier);
              if (!team) return null;

              const hasOneTeam = userData.teams.length === 1;
              const isActive = activeTeamName === team.id;

              return (
                <button
                  key={team.id}
                  className={`${styles.sideNavItem} ${hasOneTeam ? "" : styles.sideNavItemSub} ${
                    isActive ? styles.sideNavItemActive : ""
                  }`}
                  onClick={() => {
                    handleNavItemClick(`/app/thoughts/${team.id}`);
                    dispatch(setMobileSidebarOpen(false));
                  }}
                >
                  <span className={styles.sideEmoji}>{team.emoji}</span>
                  <span className={styles.navItemLabel}>
                    {shouldShowLabels && team.name}
                  </span>
                  {renderLocationIndicators(team.id)}
                </button>
              );
            })}

          {activeTab === AppTab.SETTINGS &&
            SETTINGS_NAV_ITEMS.filter((item) => !item.adminOnly).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`${styles.sideNavItem} ${
                    activeSideItem === item.id ? styles.sideNavItemActive : ""
                  }`}
                  onClick={() => {
                    handleNavItemClick(`/app/settings/${item.id}`);
                    dispatch(setMobileSidebarOpen(false));
                  }}
                >
                  <span className={styles.sideEmoji}>
                    <Icon size={18} />
                  </span>
                  <span className={styles.navItemLabel}>
                    {shouldShowLabels && item.label}
                  </span>
                  {renderLocationIndicatorsByUrl(`/app/settings/${item.id}`)}
                </button>
              );
            })}
        </nav>
        {userData?.isAdmin && activeTab === AppTab.SETTINGS && (
          <div className={styles.adminOnlySectionWrapper}>
            <div className={styles.sidenavMenuSubheading}>
              {shouldShowLabels && <h4>Admin Only</h4>}
            </div>
            <nav className={styles.sideMenuList}>
              {SETTINGS_NAV_ITEMS.filter((item) => item.adminOnly).map(
                (item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className={`${styles.sideNavItem} ${
                        activeSideItem === item.id
                          ? styles.sideNavItemActive
                          : ""
                      }`}
                      onClick={() => {
                        handleNavItemClick(`/app/settings/${item.id}`);
                        dispatch(setMobileSidebarOpen(false));
                      }}
                    >
                      <span className={styles.sideEmoji}>
                        <Icon size={18} />
                      </span>
                      <span className={styles.navItemLabel}>
                        {shouldShowLabels && item.label}
                      </span>
                      {renderLocationIndicatorsByUrl(`/app/settings/${item.id}`)}
                    </button>
                  );
                },
              )}
            </nav>
          </div>
        )}
        <div className={styles.sidebarFooter}>
          <ThemeToggleButton
            className={styles.sidebarThemeToggle}
            iconClassName={styles.sidebarThemeIcon}
          />
          <OnlineUsers variant="sidebar" showText={shouldShowLabels} />
        </div>
      </div>
    </aside>
  );
};

export default SideNav;
