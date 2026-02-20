import { useCallback, useEffect, useRef, useState } from "react";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import OnlineUsers from "./OnlineUsers";
import {
  BOTTOM_NAV_ITEMS,
  AppTab,
  SETTINGS_NAV_ITEMS,
} from "../../constants/navigation";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
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

const SideNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { teamName: activeTeamName, positionName, section } = useParams();
  const dispatch = useAppDispatch();

  const { userData } = useAppSelector((state) => state.auth);
  const { isDesktopSidebarExpanded, isMobileSidebarOpen, expandedTeams } =
    useAppSelector((state) => state.ui);
  const {
    teams: allTeams,
    fetched: teamsFetched,
    loading: teamsLoading,
  } = useAppSelector((state) => state.teams);
  const { fetched: positionsFetched } = useAppSelector(
    (state) => state.positions,
  );
  const { onlineUsers } = useAppSelector((state) => state.presence);

  // Track window width to force labels on mobile
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth <= 767;
  const shouldShowLabels = isMobile || isDesktopSidebarExpanded;

  const activeTab = location.pathname.includes("/settings")
    ? AppTab.SETTINGS
    : location.pathname.includes("/dashboard")
      ? AppTab.DASHBOARD
      : AppTab.ROSTER;
  const activeSideItem = positionName || section;

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

    if (activeTeamName && activeSideItem) {
      return `${activeTeamName} • ${activeSideItem}`;
    }
    if (activeTeamName) {
      return activeTeamName;
    }
    return activeSideItem ? `${tabLabel} • ${activeSideItem}` : tabLabel;
  };

  const renderLocationIndicators = (teamName: string, viewName?: string) => {
    const usersHere = onlineUsers.filter(
      (u) =>
        u.focus?.teamName === teamName &&
        (viewName ? u.focus?.viewName === viewName : true),
    );

    if (usersHere.length === 0) return null;

    return (
      <div className={styles.locationIndicators}>
        {usersHere.map((u) => (
          <span
            key={u.uid}
            className={styles.locationDot}
            style={{ backgroundColor: u.color }}
            title={`${u.name} is in ${u.focus?.viewName || teamName}`}
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

          {activeTab === AppTab.ROSTER
            ? userData?.teams?.map((teamName) => {
                const team = allTeams.find((t) => t.name === teamName);
                if (!team) return null;

                const hasOneTeam = userData.teams.length === 1;
                const isTeamExpanded =
                  hasOneTeam || expandedTeams.includes(team.name);

                return (
                  <div key={team.name}>
                    {!hasOneTeam && (
                      <div
                        className={`${styles.sidenavMenuSubheading} ${styles.sidenavMenuSubheadingClickable}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          handleToggleTeamExpansion(team.name);
                          handleNavItemClick(`/app/roster/${team.name}/All`);
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
                            activeTeamName === team.name
                              ? styles.sideNavItemActive
                              : ""
                          }`}
                          onClick={() => {
                            handleNavItemClick(`/app/roster/${team.name}/All`);
                            dispatch(setMobileSidebarOpen(false));
                          }}
                        >
                          <span className={styles.sideEmoji}>📋</span>
                          <span className={styles.navItemLabel}>
                            {shouldShowLabels && "All"}
                          </span>
                          {renderLocationIndicators(team.name, "All")}
                        </button>
                        {team.positions
                          ?.filter((pos) => !pos.parentId)
                          ?.map((pos) => {
                            const isActive =
                              activeSideItem === pos.name &&
                              activeTeamName === team.name;
                            return (
                              <button
                                key={pos.name}
                                className={`${styles.sideNavItem} ${styles.sideNavItemSub} ${
                                  isActive ? styles.sideNavItemActive : ""
                                }`}
                                onClick={() => {
                                  handleNavItemClick(
                                    `/app/roster/${team.name}/${pos.name}`,
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
                                {renderLocationIndicators(team.name, pos.name)}
                              </button>
                            );
                          })}
                        {team.allowAbsence !== false && (
                          <button
                            className={`${styles.sideNavItem} ${styles.sideNavItemSub} ${
                              activeSideItem === "Absence" &&
                              activeTeamName === team.name
                                ? styles.sideNavItemActive
                                : ""
                            }`}
                            onClick={() => {
                              handleNavItemClick(
                                `/app/roster/${team.name}/Absence`,
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
                            {renderLocationIndicators(team.name, "Absence")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            : SETTINGS_NAV_ITEMS.filter((item) => !item.adminOnly).map(
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
                    </button>
                  );
                },
              )}
        </nav>
        {userData?.isAdmin && activeTab === AppTab.SETTINGS && (
          <div className={styles.adminOnlySectionWrapper}>
            <div className={styles.sidenavMenuSubheading}>
              {shouldShowLabels && <h4>Admin Only</h4>}
            </div>
            {SETTINGS_NAV_ITEMS.filter((item) => item.adminOnly).map((item) => {
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
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.sidebarFooter}>
        <ThemeToggleButton
          className={styles.sidebarThemeToggle}
          iconClassName={styles.sidebarThemeIcon}
        />
        <OnlineUsers variant="sidebar" showText={shouldShowLabels} />
      </div>
    </aside>
  );
};

export default SideNav;
