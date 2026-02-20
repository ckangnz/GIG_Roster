import { useNavigate, useLocation } from "react-router-dom";

import { BOTTOM_NAV_ITEMS, AppTab } from "../../constants/navigation";
import { useAppSelector } from "../../hooks/redux";

import styles from "./bottom-nav.module.css";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lastVisitedPaths } = useAppSelector((state) => state.ui);

  const activeTab = location.pathname.includes("/settings")
    ? AppTab.SETTINGS
    : location.pathname.includes("/dashboard")
      ? AppTab.DASHBOARD
      : AppTab.ROSTER;

  const handleTabChange = (tabId: string) => {
    if (activeTab === tabId) {
      // If re-clicking the same tab, and it's Dashboard, reset to today
      if (tabId === AppTab.DASHBOARD) {
        navigate("/app/dashboard");
      }
      return;
    }

    const savedPath = lastVisitedPaths[tabId];
    if (savedPath) {
      navigate(savedPath);
    } else {
      navigate(`/app/${tabId}`);
    }
  };

  return (
    <nav className={styles.bottomNavContainer}>
      <div className={styles.bottomNav}>
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`${styles.bottomNavBtn} ${
                activeTab === item.id ? styles.bottomNavBtnActive : ""
              }`}
              onClick={() => handleTabChange(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
