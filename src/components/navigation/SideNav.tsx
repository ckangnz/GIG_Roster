import { useEffect, useState } from "react";

import { doc, getDoc } from "firebase/firestore";

import { AppTab, SETTINGS_NAV_ITEMS } from "../../constants/navigation";
import { db } from "../../firebase";
import { AppUser, Position } from "../../model/model";

import "./navigation.css";

interface SideNavProps {
  user: AppUser;
  isOpen: boolean;
  onClose: () => void;
  activeTab: string; // "roster" or "settings"
  activeSideItem: string | null;
  onSideItemChange: (item: string) => void;
}

const SideNav = ({
  user,
  isOpen,
  onClose,
  activeTab,
  activeSideItem,
  onSideItemChange,
}: SideNavProps) => {
  const [positions, setPositions] = useState<Position[]>([]);

  const sideNavTitle = activeTab === "roster" ? "Roster" : "Settings";

  useEffect(() => {
    const fetchPositions = async () => {
      const snap = await getDoc(doc(db, "metadata", "positions"));
      if (snap.exists()) {
        const list = snap.data().list || [];
        setPositions(list);

        if (activeTab === "roster" && !activeSideItem && list.length > 0) {
          onSideItemChange(list[0].name);
        }
      }
    };

    if (activeTab === "roster") {
      fetchPositions();
    } else if (activeTab === "settings" && !activeSideItem) {
      onSideItemChange("Profile");
    }
  }, [activeTab, activeSideItem, onSideItemChange]);

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-content">
        <div className="sidebar-header">
          <div className="header-spacer" style={{ width: "24px" }} />
          <h3>{sideNavTitle}</h3>
          <button className="mobile-close" onClick={onClose}>
            ×
          </button>
        </div>
        <nav className="side-menu-list">
          {activeTab === AppTab.ROSTER
            ? positions.map((pos) => (
                <button
                  key={pos.name}
                  className={`nav-item ${activeSideItem === pos.name ? "active" : ""}`}
                  onClick={() => {
                    onSideItemChange(pos.name);
                    onClose();
                  }}
                >
                  <span className="side-emoji">{pos.emoji}</span> {pos.name}
                </button>
              ))
            : SETTINGS_NAV_ITEMS.filter(
                (item) => !item.adminOnly || user.isAdmin,
              ).map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeSideItem === item.id ? "active" : ""}`}
                  onClick={() => {
                    onSideItemChange(item.id);
                    onClose();
                  }}
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
