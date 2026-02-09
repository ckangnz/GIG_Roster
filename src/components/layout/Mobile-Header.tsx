import { ChevronUpIcon } from "lucide-react";

import "./mobile-header.css";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { setMobileSidebarOpen } from "../../store/slices/uiSlice";
import ThemeToggleButton from "../common/ThemeToggleButton";

interface MobileHeaderProps {
  title: string;
}

const MobileHeader = ({ title }: MobileHeaderProps) => {
  const dispatch = useAppDispatch();
  const { isMobileSidebarOpen } = useAppSelector((state) => state.ui);
  return (
    <header className="mobile-header">
      <div
        className={`mobile-header-pill ${isMobileSidebarOpen ? "mobile-header-pill-active" : ""}`}
        onClick={() => dispatch(setMobileSidebarOpen(!isMobileSidebarOpen))}
      >
        <span className="mobile-header-text">{title}</span>
        {
          <ChevronUpIcon
            className={`mobile-header-chevron ${isMobileSidebarOpen ? "rotate" : ""}`}
          />
        }
      </div>
      <ThemeToggleButton />
    </header>
  );
};

export default MobileHeader;
