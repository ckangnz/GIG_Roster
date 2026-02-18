import { ChevronUpIcon } from "lucide-react";
import { useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { setMobileSidebarOpen } from "../../store/slices/uiSlice";
import OnlineUsers from "../roster/OnlineUsers";

import styles from "./mobile-header.module.css";

interface MobileHeaderProps {
  title: string;
  hasSideNav?: boolean;
}

const MobileHeader = ({ title, hasSideNav = true }: MobileHeaderProps) => {
  const dispatch = useAppDispatch();
  const { teamName } = useParams();
  const { isMobileSidebarOpen } = useAppSelector((state) => state.ui);
  const { userData } = useAppSelector((state) => state.auth);

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
      <OnlineUsers teamName={teamName} currentUser={userData} />
    </header>
  );
};

export default MobileHeader;
