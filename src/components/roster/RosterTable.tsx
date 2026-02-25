import { ReactNode, useEffect, RefObject } from "react";

import { RefreshCw } from "lucide-react";

import TopControls from "./TopControls";
import { useAppDispatch } from "../../hooks/redux";
import { AppUser } from "../../model/model";
import { resetToUpcomingDates } from "../../store/slices/rosterViewSlice";
import Spinner from "../common/Spinner";

import cellStyles from "./roster-cell.module.css";
import headerStyles from "./roster-header.module.css";
import rowStyles from "./roster-row.module.css";
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

  // Header Actions
  hasPastDates?: boolean;

  // Settings Actions (if any)
  hasDirtyChanges?: boolean;
  handleSave?: () => void;
  handleCancel?: () => void;
  className?: string;
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
  hasPastDates,
  className,
}: RosterTableProps) => {
  const dispatch = useAppDispatch();

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
    <div
      ref={containerRef}
      className={`${styles.rosterTableWrapper} ${className || ""}`}
      tabIndex={-1}
    >
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
          <tbody>
            {hasPastDates && (
              <tr className={headerStyles.resetRow}>
                <td
                  className={`${rowStyles.dateCell} ${rowStyles.stickyCol} ${headerStyles.resetCell}`}
                >
                  <button
                    className={headerStyles.loadPrevBtn}
                    onClick={() => dispatch(resetToUpcomingDates())}
                    title="Reset to upcoming dates"
                  >
                    <RefreshCw size={16} />
                  </button>
                </td>
                <td
                  colSpan={colCount + (isAllView ? 0 : 1)} // +1 for Peek column
                  className={cellStyles.rosterCell}
                  style={{
                    textAlign: "left",
                    paddingLeft: "12px",
                    fontSize: "0.85rem",
                    color: "var(--color-primary)",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                  onClick={() => dispatch(resetToUpcomingDates())}
                >
                  Past dates loaded. Click to reset to today.
                </td>
              </tr>
            )}
            {children}
          </tbody>
        </table>
        <div className={styles.loadMoreFooter}>
          <button className={styles.loadNextYearBtn} onClick={onLoadNextYear}>
            Load Next Year ↓
          </button>
        </div>
      </div>
    </div>
  );
};

export default RosterTable;
