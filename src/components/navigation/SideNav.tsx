import { useEffect, useState } from "react";

import { doc, getDoc } from "firebase/firestore";

import { db } from "../../firebase";
import { Position } from "../../model/model";
import "./navigation.css";

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  selectedPosition: string | null;
  onPositionChange: (pos: string) => void;
}

const SideNav = ({
  isOpen,
  onClose,
  activeTab,
  selectedPosition,
  onPositionChange,
}: SideNavProps) => {
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    const fetchPositions = async () => {
      const docRef = doc(db, "metadata", "positions");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const list = snap.data().list || [];
        setPositions(list);
        if (activeTab === "roster" && !selectedPosition && list.length > 0) {
          onPositionChange(list[0].name);
        }
      }
    };
    fetchPositions();
  }, [activeTab, onPositionChange, selectedPosition]);

  return (
    <>
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h3>{activeTab === "roster" ? "Roster" : "Settings"}</h3>
            <button className="mobile-close" onClick={onClose}>
              ×
            </button>
          </div>
          <nav className="side-menu-list">
            {activeTab === "roster" ? (
              positions.map((pos) => (
                <button
                  key={pos.name}
                  className={`nav-item ${selectedPosition === pos.name ? "active" : ""}`}
                  onClick={() => {
                    onPositionChange(pos.name);
                    onClose();
                  }}
                >
                  <span className="side-emoji">{pos.emoji}</span> {pos.name}
                </button>
              ))
            ) : (
              <p className="side-info">Settings Selected</p>
            )}
          </nav>
        </div>
      </aside>
      <div className="sidebar-overlay" onClick={onClose} />
    </>
  );
};

export default SideNav;
