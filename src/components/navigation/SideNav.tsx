import { useEffect, useState } from "react";

import { doc, getDoc } from "firebase/firestore";

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

  useEffect(() => {
    if (activeTab === "roster") {
      const fetchPositions = async () => {
        const snap = await getDoc(doc(db, "metadata", "positions"));
        if (snap.exists()) {
          const list = snap.data().list || [];
          setPositions(list);
          // Default to first position if none selected
          if (!activeSideItem && list.length > 0)
            onSideItemChange(list[0].name);
        }
      };
      fetchPositions();
    } else {
      // If in Settings, default to Profile
      if (!activeSideItem) onSideItemChange("Profile");
    }
  }, [activeTab, onSideItemChange, activeSideItem]);

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-content">
        <div className="sidebar-header">
          <h3>{activeTab === "roster" ? "Positions" : "Management"}</h3>
          <button className="mobile-close" onClick={onClose}>
            ×
          </button>
        </div>
        <nav className="side-menu-list">
          {activeTab === "roster" ? (
            positions.map((pos) => (
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
          ) : (
            <>
              <button
                className={`nav-item ${activeSideItem === "Profile" ? "active" : ""}`}
                onClick={() => {
                  onSideItemChange("Profile");
                  onClose();
                }}
              >
                <span className="side-emoji">👤</span> My Profile
              </button>
              {user.isAdmin && (
                <>
                  <button
                    className={`nav-item ${activeSideItem === "Users" ? "active" : ""}`}
                    onClick={() => {
                      onSideItemChange("Users");
                      onClose();
                    }}
                  >
                    <span className="side-emoji">👥</span> User Management
                  </button>
                  <button
                    className={`nav-item ${activeSideItem === "Positions" ? "active" : ""}`}
                    onClick={() => {
                      onSideItemChange("Positions");
                      onClose();
                    }}
                  >
                    <span className="side-emoji">🎹</span> Position Setup
                  </button>
                </>
              )}
            </>
          )}
        </nav>
      </div>
    </aside>
  );
};

export default SideNav;
