import { useNavigate, useLocation } from 'react-router-dom';

import { BOTTOM_NAV_ITEMS, AppTab } from '../../constants/navigation';
import { useAppSelector } from '../../hooks/redux';
import './bottom-nav.css';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lastVisitedPaths } = useAppSelector((state) => state.ui);

  const activeTab = location.pathname.includes('/settings')
    ? AppTab.SETTINGS
    : location.pathname.includes('/dashboard')
      ? AppTab.DASHBOARD
      : AppTab.ROSTER;

  const handleTabChange = (tabId: string) => {
    if (activeTab === tabId) return;

    const savedPath = lastVisitedPaths[tabId];
    if (savedPath) {
      navigate(savedPath);
    } else {
      navigate(`/app/${tabId}`);
    }
  };

  return (
    <nav className="bottom-nav-container">
      <div className="bottom-nav">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`bottom-nav-btn ${activeTab === item.id ? 'bottom-nav-btn-active' : ''}`}
            onClick={() => handleTabChange(item.id)}
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
