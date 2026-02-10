import { ChevronUpIcon } from "lucide-react";

import "./mobile-header.css";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { setMobileSidebarOpen } from "../../store/slices/uiSlice";
import ThemeToggleButton from "../common/ThemeToggleButton";

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
    <header className="mobile-header">
      <div
        className={`mobile-header-pill ${
          isMobileSidebarOpen ? "mobile-header-pill-active" : ""
        } ${!hasSideNav ? "mobile-header-pill-disabled" : ""}`}
        onClick={handleToggle}
      >
        <span className="mobile-header-text">{title}</span>
        {hasSideNav && (
          <ChevronUpIcon
            className={`mobile-header-chevron ${isMobileSidebarOpen ? "rotate" : ""}`}
          />
        )}
      </div>
      <ThemeToggleButton />
    </header>
  );
};

export default MobileHeader;
