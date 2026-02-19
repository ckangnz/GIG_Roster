import { ChevronUpIcon } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { setMobileSidebarOpen } from "../../store/slices/uiSlice";
import ThemeToggleButton from "../common/ThemeToggleButton";
import OnlineUsers from "../navigation/OnlineUsers";

import styles from "./mobile-header.module.css";

interface MobileHeaderProps {
  title: string;
  hasSideNav?: boolean;
}

const MobileHeader = ({ title, hasSideNav = true }: MobileHeaderProps) => {
  const dispatch = useAppDispatch();
  const { isMobileSidebarOpen } = useAppSelector((state) => state.ui);

  const handleToggle = () => {
    if (hasSideNav) {
      dispatch(setMobileSidebarOpen(!isMobileSidebarOpen));
    }
  };

  return (
    <header className={styles.mobileHeader}>
      <div
        className={`${styles.mobileHeaderPill} ${
          isMobileSidebarOpen ? styles.mobileHeaderPillActive : ""
        } ${!hasSideNav ? styles.mobileHeaderPillDisabled : ""}`}
        onClick={handleToggle}
      >
        <span className={styles.mobileHeaderText}>{title}</span>
        {hasSideNav && (
          <ChevronUpIcon
            className={`${styles.mobileHeaderChevron} ${isMobileSidebarOpen ? styles.rotate : ""}`}
          />
        )}
      </div>
      <div className={styles.mobileHeaderActions}>
        <ThemeToggleButton className={styles.mobileThemeToggle} />
        <OnlineUsers />
      </div>
    </header>
  );
};

export default MobileHeader;
