import { useEffect, useState } from "react";

import { doc, getDoc } from "firebase/firestore";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import {
  AppTab,
  SETTINGS_NAV_ITEMS,
  SettingsSection,
} from "../../constants/navigation";
import { db } from "../../firebase";
import { AppUser, Position } from "../../model/model";
import ThemeToggleButton from "../common/ThemeToggleButton";

import "./side-nav.css";

interface SideNavProps {
  user: AppUser;
  activeTab: string;
  activeSideItem: string | null;
  onSideItemChange: (item: string, isManual: boolean) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  headerTitle: string;
}

const SideNav = ({
  user,
  activeTab,
  activeSideItem,
  onSideItemChange,
  isSidebarOpen,
  setSidebarOpen,
  headerTitle,
}: SideNavProps) => {
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const snap = await getDoc(doc(db, "metadata", "positions"));
        if (snap.exists()) {
          const list = snap.data().list || [];
          setPositions(list);
          if (
            activeTab === AppTab.ROSTER &&
            !activeSideItem &&
            list.length > 0
          ) {
            onSideItemChange(list[0].name, false);
          }
        }
      } catch (e) {
        console.error("Error fetching positions:", e);
      }
    };

    if (activeTab === AppTab.ROSTER) {
      fetchPositions();
    } else if (activeTab === AppTab.SETTINGS && !activeSideItem) {
      onSideItemChange(SettingsSection.PROFILE, false);
    }
  }, [activeTab, activeSideItem, onSideItemChange]);

  return (
    <aside className="side-nav">
      <div className="sidebar-content">
        <div className="tablet-sidebar-header">
          {isSidebarOpen && <h3>{headerTitle}</h3>}
          {/* Collapse button */}
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
          {activeTab === AppTab.ROSTER && positions.length === 0 && (
            <div className="side-nav-item loading">Loading...</div>
          )}

          {activeTab === AppTab.ROSTER ? (
            positions.map((pos) => {
              const isActive = activeSideItem === pos.name;
              return (
                <button
                  key={pos.name}
                  className={`side-nav-item ${isActive ? "side-nav-item-active" : ""}`}
                  onClick={() => onSideItemChange(pos.name, true)}
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
                  {isSidebarOpen && pos.name}
                </button>
              );
            })
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

      {user.isAdmin &&
        activeTab === AppTab.SETTINGS &&
        SETTINGS_NAV_ITEMS.some((item) => item.adminOnly) && (
          <div className="admin-only-section-wrapper">
            <div className="admin-section-heading">
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
      <ThemeToggleButton showText={isSidebarOpen} />
    </aside>
  );
};

export default SideNav;
