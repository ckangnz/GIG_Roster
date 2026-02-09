import { useCallback, useEffect } from "react";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { AppTab, SETTINGS_NAV_ITEMS } from "../../constants/navigation";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { fetchPositions } from "../../store/slices/positionsSlice";
import { fetchTeams } from "../../store/slices/teamsSlice";
import {
  setDesktopSidebarExpanded,
  setMobileSidebarOpen,
  toggleTeamExpansion,
} from "../../store/slices/uiSlice";
import ThemeToggleButton from "../common/ThemeToggleButton";
import "./side-nav.css";

const SideNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const dispatch = useAppDispatch();

  const { userData } = useAppSelector((state) => state.auth);
  const { isDesktopSidebarExpanded, expandedTeams } = useAppSelector(
    (state) => state.ui,
  );
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
    : AppTab.ROSTER;
  const { teamName: activeTeamName, positionName, section } = params;
  const activeSideItem = positionName || section;

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
    const currentTabInfo =
      activeTab === AppTab.ROSTER
        ? { label: "Roster" }
        : SETTINGS_NAV_ITEMS.find((item) => item.id === activeSideItem) || {
            label: "Settings",
          };
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
    <aside className="side-nav">
      <div className="sidebar-content">
        <div className="tablet-sidebar-header">
          {isDesktopSidebarExpanded && <h3>{getHeaderTitle()}</h3>}
          <button
            className="sidebar-toggle-button"
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

        <nav className="side-menu-list">
          {activeTab === AppTab.ROSTER && teamsLoading && (
            <div className="side-nav-item loading">Loading teams...</div>
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
                        className="sidenav-menu-subheading sidenav-menu-subheading-clickable"
                        style={{ cursor: "pointer" }}
                        onClick={() => handleToggleTeamExpansion(team.name)}
                      >
                        <div>
                          {team.emoji} {isDesktopSidebarExpanded && team.name}
                        </div>
                        <span className="expand-icon">
                          {isTeamExpanded ? "▼" : "▶"}
                        </span>
                      </div>
                    )}
                    {isTeamExpanded &&
                      team.positions?.map((pos) => {
                        const isActive =
                          activeSideItem === pos.name &&
                          activeTeamName === team.name;
                        return (
                          <button
                            key={pos.name}
                            className={`side-nav-item side-nav-item-sub ${
                              isActive ? "side-nav-item-active" : ""
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
                            <span className="side-emoji">{pos.emoji}</span>{" "}
                            {isDesktopSidebarExpanded && pos.name}
                          </button>
                        );
                      })}
                  </div>
                );
              })
            : SETTINGS_NAV_ITEMS.filter((item) => !item.adminOnly).map(
                (item) => (
                  <button
                    key={item.id}
                    className={`side-nav-item ${
                      activeSideItem === item.id ? "side-nav-item-active" : ""
                    }`}
                    onClick={() => {
                      handleNavItemClick(`/app/settings/${item.id}`);
                      dispatch(setMobileSidebarOpen(false));
                    }}
                  >
                    <span className="side-emoji">{item.icon}</span>{" "}
                    {isDesktopSidebarExpanded && item.label}
                  </button>
                ),
              )}
        </nav>
      </div>

      {userData?.isAdmin && activeTab === AppTab.SETTINGS && (
        <div className="admin-only-section-wrapper">
          <div className="sidenav-menu-subheading">
            {isDesktopSidebarExpanded && <h4>Admin Only</h4>}
          </div>
          {SETTINGS_NAV_ITEMS.filter((item) => item.adminOnly).map((item) => (
            <button
              key={item.id}
              className={`side-nav-item ${
                activeSideItem === item.id ? "side-nav-item-active" : ""
              }`}
              onClick={() => {
                handleNavItemClick(`/app/settings/${item.id}`);
                dispatch(setMobileSidebarOpen(false));
              }}
            >
              <span className="side-emoji">{item.icon}</span>{" "}
              {isDesktopSidebarExpanded && item.label}
            </button>
          ))}
        </div>
      )}
      <div className="sidebar-footer">
        <ThemeToggleButton showText={isDesktopSidebarExpanded} />
      </div>
    </aside>
  );
};

export default SideNav;
