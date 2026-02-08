import { useEffect, useState } from "react";

import { doc, getDoc } from "firebase/firestore";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import {
  AppTab,
  SETTINGS_NAV_ITEMS,
  SettingsSection,
} from "../../constants/navigation";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { Team } from "../../model/model";
import ThemeToggleButton from "../common/ThemeToggleButton";

import "./side-nav.css";

interface SideNavProps {
  activeTab: string;
  activeSideItem: string | null;
  onSideItemChange: (item: string, isManual: boolean) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  headerTitle: string;
}

const SideNav = ({
  activeTab,
  activeSideItem,
  onSideItemChange,
  isSidebarOpen,
  setSidebarOpen,
  headerTitle,
}: SideNavProps) => {
  const { userData } = useAuth();

  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<string[]>([]);

  const toggleTeamExpansion = (teamName: string) => {
    setExpandedTeams((prev) =>
      prev.includes(teamName)
        ? prev.filter((name) => name !== teamName)
        : [...prev, teamName],
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamsDocRef = doc(db, "metadata", "teams");
        const teamsSnap = await getDoc(teamsDocRef);
        if (teamsSnap.exists()) {
          const data = teamsSnap.data();
          const teamsList = Array.isArray(data.list)
            ? data.list.map((teamData: Team) => ({
                ...teamData,
                preferredDays: teamData.preferredDays || [],
                positions: teamData.positions || [],
              }))
            : [];
          setAllTeams(teamsList);

          if (
            activeTab === AppTab.ROSTER &&
            !activeSideItem &&
            teamsList.length > 0 &&
            teamsList[0].positions.length > 0
          ) {
            onSideItemChange(teamsList[0].positions[0].name, false);
          }
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
      }
    };

    if (activeTab === AppTab.ROSTER) {
      fetchData();
    } else if (activeTab === AppTab.SETTINGS && !activeSideItem) {
      onSideItemChange(SettingsSection.PROFILE, false);
    }
  }, [activeTab, activeSideItem, onSideItemChange]);

  return (
    <aside className="side-nav">
      <div className="sidebar-content">
        <div className="tablet-sidebar-header">
          {isSidebarOpen && <h3>{headerTitle}</h3>}
          <button
            className="sidebar-toggle-button"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarOpen ? (
              <PanelLeftClose size={20} />
            ) : (
              <PanelLeftOpen size={20} />
            )}
          </button>
        </div>

        <nav className="side-menu-list">
          {activeTab === AppTab.ROSTER &&
            userData &&
            userData.teams &&
            userData.teams.length > 0 &&
            allTeams.length === 0 && (
              <div className="side-nav-item loading">Loading teams...</div>
            )}
          {activeTab === AppTab.ROSTER && allTeams.length === 0 && (
            <div className="side-nav-item loading">Loading positions...</div>
          )}

          {activeTab === AppTab.ROSTER ? (
            userData && userData.teams && userData.teams.length > 0 ? (
              userData.teams.map((teamName) => {
                const team = allTeams.find((t) => t.name === teamName);
                if (!team) return null;

                const hasOneTeam = userData.teams.length === 1;
                const isTeamExpanded = hasOneTeam
                  ? true
                  : expandedTeams.includes(team.name);

                return (
                  <div key={team.name}>
                    {!hasOneTeam && (
                      <div
                        className="sidenav-menu-subheading sidenav-menu-subheading-clickable"
                        style={{ cursor: "pointer" }}
                        onClick={() => toggleTeamExpansion(team.name)}
                      >
                        <div>
                          {team.emoji} {isSidebarOpen && team.name}
                        </div>
                        <span className="expand-icon">
                          {isTeamExpanded ? "▼" : "▶"}
                        </span>
                      </div>
                    )}
                    {isTeamExpanded &&
                      team.positions &&
                      team.positions.length > 0 && (
                        <div className="side-nav-sub-items">
                          {team.positions.map((pos) => {
                            const isActivePosition =
                              activeSideItem === pos.name;
                            return (
                              <button
                                key={pos.name}
                                className={`side-nav-item side-nav-item-sub ${isActivePosition ? "side-nav-item-active" : ""}`}
                                onClick={() => onSideItemChange(pos.name, true)}
                                style={{
                                  borderLeft: isActivePosition
                                    ? `4px solid ${pos.colour}`
                                    : "4px solid transparent",
                                  backgroundColor: isActivePosition
                                    ? `${pos.colour}15`
                                    : "transparent",
                                  color: isActivePosition ? pos.colour : "",
                                }}
                              >
                                <span className="side-emoji">{pos.emoji}</span>{" "}
                                {isSidebarOpen && pos.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                  </div>
                );
              })
            ) : (
              <div className="side-nav-item no-teams">No teams assigned.</div>
            )
          ) : (
            <>
              {SETTINGS_NAV_ITEMS.filter((item) => !item.adminOnly).map(
                (item) => (
                  <button
                    key={item.id}
                    className={`side-nav-item ${activeSideItem === item.id ? "side-nav-item-active" : ""}`}
                    onClick={() => onSideItemChange(item.id, true)}
                  >
                    <span className="side-emoji">{item.icon}</span>{" "}
                    {isSidebarOpen && item.label}
                  </button>
                ),
              )}
            </>
          )}
        </nav>
      </div>

      {userData &&
        userData.isAdmin &&
        activeTab === AppTab.SETTINGS &&
        SETTINGS_NAV_ITEMS.some((item) => item.adminOnly) && (
          <div className="admin-only-section-wrapper">
            <div className="sidenav-menu-subheading">
              {isSidebarOpen && <h4>Admin Only</h4>}
            </div>
            {SETTINGS_NAV_ITEMS.filter((item) => item.adminOnly).map((item) => (
              <button
                key={item.id}
                className={`side-nav-item ${activeSideItem === item.id ? "side-nav-item-active" : ""}`}
                onClick={() => onSideItemChange(item.id, true)}
              >
                <span className="side-emoji">{item.icon}</span>{" "}
                {isSidebarOpen && item.label}
              </button>
            ))}
          </div>
        )}
      <div className="sidebar-footer">
        <ThemeToggleButton showText={isSidebarOpen} />
      </div>
    </aside>
  );
};

export default SideNav;
