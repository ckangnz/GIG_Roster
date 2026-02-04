import { useEffect, useState } from "react";

import { doc, getDoc } from "firebase/firestore";

import { db } from "../../firebase";
import { AppUser, Position } from "../../model/model";

import "./main-layout.css";

interface MainLayoutProps {
  user: AppUser;
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedPosition: string | null;
  onPositionChange: (pos: string) => void;
}

const MainLayout = ({
  children,
  activeTab,
  onTabChange,
  selectedPosition,
  onPositionChange,
}: MainLayoutProps) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
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

  const handleTabClick = (tab: string) => {
    onTabChange(tab);
    // Reset selection or force first option when switching back to roster
    if (tab === "roster" && positions.length > 0) {
      onPositionChange(positions[0].name);
    }
  };

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <button onClick={() => setSidebarOpen(true)} className="menu-trigger">
          ☰
        </button>
        <h1 className="logo">GIG ROSTER</h1>
        <div className="header-spacer" />
      </header>

      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h3>{activeTab === "roster" ? "Positions" : "Menu"}</h3>
            <button
              className="mobile-close"
              onClick={() => setSidebarOpen(false)}
            >
              ×
            </button>
          </div>

          <nav className="side-nav">
            {activeTab === "roster" ? (
              positions.map((pos) => (
                <button
                  key={pos.name}
                  className={`nav-item ${selectedPosition === pos.name ? "active" : ""}`}
                  onClick={() => {
                    onPositionChange(pos.name);
                    setSidebarOpen(false);
                  }}
                >
                  <span className="side-emoji">{pos.emoji}</span> {pos.name}
                </button>
              ))
            ) : (
              <p className="side-info">Settings selected</p>
            )}
          </nav>
        </div>
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      </aside>

      <main className="main-content">{children}</main>

      <nav className="bottom-nav-container">
        <div className="bottom-nav">
          <button
            className={`nav-btn ${activeTab === "roster" ? "active" : ""}`}
            onClick={() => handleTabClick("roster")}
          >
            <span className="nav-icon">🗓️</span>
            <span className="nav-label">Roster</span>
          </button>

          <button
            className={`nav-btn ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => handleTabClick("settings")}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default MainLayout;
