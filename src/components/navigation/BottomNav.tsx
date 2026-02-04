import "./navigation.css";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <nav className="bottom-nav-container">
      <div className="bottom-nav">
        <button
          className={`nav-btn ${activeTab === "roster" ? "active" : ""}`}
          onClick={() => onTabChange("roster")}
        >
          <span className="nav-icon">🗓️</span>
          <span className="nav-label">Roster</span>
        </button>
        <button
          className={`nav-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => onTabChange("settings")}
        >
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">Settings</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
