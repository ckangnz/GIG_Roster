import { useEffect, useState } from "react";

import { doc, getDoc } from "firebase/firestore";

import {
  AppTab,
  SETTINGS_NAV_ITEMS,
  SettingsSection,
} from "../../constants/navigation";
import { db } from "../../firebase";
import { AppUser, Position } from "../../model/model";
import "./navigation.css";

interface SideNavProps {
  user: AppUser;
  activeTab: string;
  activeSideItem: string | null;
  onSideItemChange: (item: string, isManual: boolean) => void;
}

const SideNav = ({
  user,
  activeTab,
  activeSideItem,
  onSideItemChange,
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
  }, [activeTab]);

  return (
    <aside className="side-nav">
      <div className="sidebar-content">
        <div className="tablet-sidebar-header">
          <h3>{activeTab === AppTab.ROSTER ? "Positions" : "Settings"}</h3>
        </div>

        <nav className="side-menu-list">
          {activeTab === AppTab.ROSTER && positions.length === 0 && (
            <div className="nav-item loading">Loading...</div>
          )}

          {activeTab === AppTab.ROSTER
            ? positions.map((pos) => {
                const isActive = activeSideItem === pos.name;
                return (
                  <button
                    key={pos.name}
                    className={`nav-item ${isActive ? "active" : ""}`}
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
                    <span className="side-emoji">{pos.emoji}</span> {pos.name}
                  </button>
                );
              })
            : SETTINGS_NAV_ITEMS.filter(
                (item) => !item.adminOnly || user.isAdmin,
              ).map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeSideItem === item.id ? "active" : ""}`}
                  onClick={() => onSideItemChange(item.id, true)}
                >
                  <span className="side-emoji">{item.icon}</span> {item.label}
                </button>
              ))}
        </nav>
      </div>
    </aside>
  );
};

export default SideNav;
