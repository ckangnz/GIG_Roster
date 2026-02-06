import { BOTTOM_NAV_ITEMS } from "../../constants/navigation";
import "./bottom-nav.css";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <nav className="bottom-nav-container">
      <div className="bottom-nav">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`bottom-nav-btn ${activeTab === item.id ? "bottom-nav-btn-active" : ""}`}
            onClick={() => onTabChange(item.id)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
