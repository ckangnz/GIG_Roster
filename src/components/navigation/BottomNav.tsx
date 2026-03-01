import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";

import { BOTTOM_NAV_ITEMS, AppTab } from "../../constants/navigation";
import { useAppSelector } from "../../hooks/redux";
import { selectQualifiedCoverageRequests } from "../../store/selectors/rosterSelectors";

import styles from "./bottom-nav.module.css";

const BottomNav = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { lastVisitedPaths } = useAppSelector((state) => state.ui);
  const qualifiedRequests = useAppSelector(selectQualifiedCoverageRequests);
  const hasNeeds = qualifiedRequests.length > 0;

  const activeTab = location.pathname.includes("/settings")
    ? AppTab.SETTINGS
    : location.pathname.includes("/thoughts")
      ? AppTab.THOUGHTS
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
          const showBadge = item.id === AppTab.DASHBOARD && hasNeeds;

          return (
            <button
              key={item.id}
              className={`${styles.bottomNavBtn} ${
                activeTab === item.id ? styles.bottomNavBtnActive : ""
              }`}
              onClick={() => handleTabChange(item.id)}
            >
              <div style={{ position: "relative", display: "flex" }}>
                <Icon size={20} />
                {showBadge && <div className={styles.navBadge} />}
              </div>
              <span>{t(`nav.${item.id.toLowerCase()}`, { defaultValue: item.label })}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
