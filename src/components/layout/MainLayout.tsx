import { BOTTOM_NAV_ITEMS } from "../../constants/navigation";
import { AppUser } from "../../model/model";
import BottomNav from "../navigation/BottomNav";
import SideNav from "../navigation/SideNav";
import "./main-layout.css";

interface MainLayoutProps {
  user: AppUser;
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  activeSideItem: string | null;
  onSideItemChange: (item: string) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const MainLayout = ({
  user,
  children,
  activeTab,
  onTabChange,
  activeSideItem,
  onSideItemChange,
  isSidebarOpen,
  setSidebarOpen,
}: MainLayoutProps) => {
  const getHeaderTitle = () => {
    const currentTab = BOTTOM_NAV_ITEMS.find((item) => item.id === activeTab);
    const tabLabel = currentTab ? currentTab.label : "GIG ROSTER";
    return activeSideItem ? `${tabLabel} • ${activeSideItem}` : tabLabel;
  };

  // Only close sidebar on mobile if the selection was a manual user click
  const handleSideItemChange = (item: string, isManual: boolean) => {
    onSideItemChange(item);
    if (isManual && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className={`app-shell ${isSidebarOpen ? "menu-open" : ""}`}>
      <header
        className="mobile-header"
        onClick={() => setSidebarOpen(!isSidebarOpen)}
      >
        <div className="header-content">
          <span className="current-context">{getHeaderTitle()}</span>
          <span className={`dropdown-arrow ${isSidebarOpen ? "up" : "down"}`}>
            ▾
          </span>
        </div>
      </header>

      <SideNav
        user={user}
        activeTab={activeTab}
        activeSideItem={activeSideItem}
        onSideItemChange={handleSideItemChange}
      />

      <main className="main-content">
        <div className="content-container">{children}</div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
};

export default MainLayout;
