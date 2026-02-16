import { useCallback, useEffect, useRef } from "react";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

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
  const params = useParams();
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

  const activeTab = location.pathname.includes("/settings")
    ? AppTab.SETTINGS
    : location.pathname.includes("/dashboard")
      ? AppTab.DASHBOARD
      : AppTab.ROSTER;
  const { teamName: activeTeamName, positionName, section } = params;
  const activeSideItem = positionName || section;

  const prevTeamRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (activeTeamName && activeTab === AppTab.ROSTER && activeTeamName !== prevTeamRef.current) {
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
          {isDesktopSidebarExpanded && <h3>{getHeaderTitle()}</h3>}
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
                        <div>
                          {team.emoji} {isDesktopSidebarExpanded && team.name}
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
                            handleNavItemClick(
                              `/app/roster/${team.name}/All`,
                            );
                            dispatch(setMobileSidebarOpen(false));
                          }}
                          style={{
                            borderLeft:
                              activeSideItem === "All" &&
                              activeTeamName === team.name
                                ? "4px solid var(--color-primary)"
                                : "4px solid transparent",
                            backgroundColor:
                              activeSideItem === "All" &&
                              activeTeamName === team.name
                                ? "var(--background-toggle-on-transparent)"
                                : "transparent",
                            color:
                              activeSideItem === "All" &&
                              activeTeamName === team.name
                                ? "var(--color-primary)"
                                : "",
                          }}
                        >
                          <span className={styles.sideEmoji}>📋</span>{" "}
                          {isDesktopSidebarExpanded && "All"}
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
                                style={{
                                  borderLeft: isActive
                                    ? `4px solid ${pos.colour}`
                                    : "4px solid transparent",
                                  backgroundColor: isActive
                                    ? `${pos.colour}15`
                                    : "transparent",
                                  color: isActive ? pos.colour : "",
                                }}
                              >
                                <span className={styles.sideEmoji}>
                                  {pos.emoji}
                                </span>{" "}
                                {isDesktopSidebarExpanded && pos.name}
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
                            style={{
                              borderLeft:
                                activeSideItem === "Absence" &&
                                activeTeamName === team.name
                                  ? "4px solid var(--color-error)"
                                  : "4px solid transparent",
                              backgroundColor:
                                activeSideItem === "Absence" &&
                                activeTeamName === team.name
                                  ? "var(--background-toggle-off-transparent)"
                                  : "transparent",
                            }}
                          >
                            <span className={styles.sideEmoji}>🏥</span>{" "}
                            {isDesktopSidebarExpanded && "Absence"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            : SETTINGS_NAV_ITEMS.filter((item) => !item.adminOnly).map(
                (item) => (
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
                    <span className={styles.sideEmoji}>{item.icon}</span>{" "}
                    {isDesktopSidebarExpanded && item.label}
                  </button>
                ),
              )}
        </nav>
      </div>

      {userData?.isAdmin && activeTab === AppTab.SETTINGS && (
        <div className={styles.adminOnlySectionWrapper}>
          <div className={styles.sidenavMenuSubheading}>
            {isDesktopSidebarExpanded && <h4>Admin Only</h4>}
          </div>
          {SETTINGS_NAV_ITEMS.filter((item) => item.adminOnly).map((item) => (
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
              <span className={styles.sideEmoji}>{item.icon}</span>{" "}
              {isDesktopSidebarExpanded && item.label}
            </button>
          ))}
        </div>
      )}
      <div className={styles.sidebarFooter}>
        <ThemeToggleButton showText={isDesktopSidebarExpanded} />
      </div>
    </aside>
  );
};

export default SideNav;
