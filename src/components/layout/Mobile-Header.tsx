import { ChevronUpIcon } from "lucide-react";

import "./mobile-header.css";
import ThemeToggleButton from "../common/ThemeToggleButton";

interface MobileHeaderProps {
  title: string;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const MobileHeader = ({
  title,
  isSidebarOpen,
  setSidebarOpen,
}: MobileHeaderProps) => {
  return (
    <header className="mobile-header">
      <div
        className={`mobile-header-pill ${isSidebarOpen ? "mobile-header-pill-active" : ""}`}
        onClick={() => setSidebarOpen(!isSidebarOpen)}
      >
        <span className="mobile-header-text">{title}</span>
        {
          <ChevronUpIcon
            className={`mobile-header-chevron ${isSidebarOpen ? "rotate" : ""}`}
          />
        }
      </div>
      <ThemeToggleButton />
    </header>
  );
};

export default MobileHeader;
