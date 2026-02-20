import { ReactNode, useEffect, RefObject } from "react";

import TopControls from "./TopControls";
import { AppUser } from "../../model/model";
import Spinner from "../common/Spinner";

import styles from "./roster-table.module.css";

interface RosterTableProps {
  // Shared State
  isAllView: boolean;
  isAbsenceView: boolean;
  rosterAllViewMode: "user" | "position";
  hiddenUserList: string[];
  users: AppUser[];
  handleToggleVisibility: (email: string) => void;

  // Loading & Error
  isLoading: boolean;
  error: string | null;

  // Syncing
  syncing: Record<string, boolean>;

  // Header & Rows
  renderHeader: () => ReactNode;
  children: ReactNode;

  // Footer
  onLoadNextYear: () => void;

  // Accessibility & Navigation
  containerRef: RefObject<HTMLDivElement | null>;
  focusedCell: {
    row: number;
    col: number;
    table: "roster" | "absence" | "all";
  } | null;
  setFocusedCell: (
    cell: {
      row: number;
      col: number;
      table: "roster" | "absence" | "all";
    } | null,
  ) => void;
  rosterDates: string[];
  colCount: number;
  onCellClick?: (row: number, col: number) => void;

  // Settings Actions (if any)
  hasDirtyChanges?: boolean;
  handleSave?: () => void;
  handleCancel?: () => void;
}

const RosterTable = ({
  isAllView,
  isAbsenceView,
  rosterAllViewMode,
  hiddenUserList,
  users,
  handleToggleVisibility,
  isLoading,
  error,
  syncing,
  renderHeader,
  children,
  onLoadNextYear,
  containerRef,
  focusedCell,
  setFocusedCell,
  rosterDates,
  colCount,
  onCellClick,
  hasDirtyChanges,
  handleSave,
  handleCancel,
}: RosterTableProps) => {
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "Escape") {
        e.preventDefault();
        setFocusedCell(null);
        if (handleCancel && hasDirtyChanges) handleCancel();
        return;
      }

      if (!focusedCell) return;

      const { row, col, table } = focusedCell;
      const rowCount = rosterDates.length;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          if (row > 0) setFocusedCell({ row: row - 1, col, table });
          break;
        case "ArrowDown":
          e.preventDefault();
          if (row < rowCount - 1) setFocusedCell({ row: row + 1, col, table });
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (col > 0) setFocusedCell({ row, col: col - 1, table });
          break;
        case "ArrowRight":
          e.preventDefault();
          if (col < colCount - 1) setFocusedCell({ row, col: col + 1, table });
          break;
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            if (row > 0) setFocusedCell({ row: row - 1, col, table });
          } else {
            if (row < rowCount - 1)
              setFocusedCell({ row: row + 1, col, table });
          }
          break;
        case " ":
          e.preventDefault();
          if (onCellClick) onCellClick(row, col);
          break;
        case "Enter":
          if (hasDirtyChanges && handleSave) {
            e.preventDefault();
            handleSave();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    focusedCell,
    rosterDates.length,
    colCount,
    onCellClick,
    handleSave,
    handleCancel,
    hasDirtyChanges,
    setFocusedCell,
  ]);

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return <div className={styles.rosterTableError}>Error: {error}</div>;
  }

  const isGlobalSyncing = Object.values(syncing).some((v) => v);

  return (
    <div ref={containerRef} className={styles.rosterTableWrapper} tabIndex={-1}>
      <TopControls
        isAllView={isAllView}
        isAbsenceView={isAbsenceView}
        rosterAllViewMode={rosterAllViewMode}
        hiddenUserList={hiddenUserList}
        allUsers={users}
        onToggleVisibility={handleToggleVisibility}
      />

      {isGlobalSyncing && (
        <div className={styles.syncIndicator}>Syncing changes...</div>
      )}

      <div className={styles.rosterSection}>
        <table
          className={`${styles.rosterTable} ${isAbsenceView ? styles.absenceTable : ""}`}
        >
          {renderHeader()}
          <tbody>{children}</tbody>
        </table>
      </div>
      <div className={styles.loadMoreFooter}>
        <button className={styles.loadNextYearBtn} onClick={onLoadNextYear}>
          Load Next Year ↓
        </button>
      </div>
    </div>
  );
};

export default RosterTable;
