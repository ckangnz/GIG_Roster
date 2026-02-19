import { ReactNode } from "react";

import TopControls from "./TopControls";
import { AppUser } from "../../model/model";
import SaveFooter from "../common/SaveFooter";
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

  // Saving
  hasDirtyChanges: boolean;
  isSaving: boolean;
  handleSave: () => void;
  handleCancel: () => void;

  // Header & Rows
  renderHeader: () => ReactNode;
  children: ReactNode;

  // Footer
  onLoadNextYear: () => void;
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
  hasDirtyChanges,
  isSaving,
  handleSave,
  handleCancel,
  renderHeader,
  children,
  onLoadNextYear,
}: RosterTableProps) => {
  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return <div className={styles.rosterTableError}>Error: {error}</div>;
  }

  return (
    <div className={styles.rosterTableWrapper}>
      <TopControls
        isAllView={isAllView}
        isAbsenceView={isAbsenceView}
        rosterAllViewMode={rosterAllViewMode}
        hiddenUserList={hiddenUserList}
        allUsers={users}
        onToggleVisibility={handleToggleVisibility}
      />

      <div className={styles.rosterTableContainer}>
        <table
          className={`${styles.rosterTable} ${isAbsenceView ? styles.absenceTable : ""}`}
        >
          {renderHeader()}
          <tbody>{children}</tbody>
        </table>
        <div className={styles.loadMoreFooter}>
          <button className={styles.loadNextYearBtn} onClick={onLoadNextYear}>
            Load Next Year ↓
          </button>
        </div>
      </div>

      {hasDirtyChanges && (
        <SaveFooter
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
          saveText="Save Roster"
        />
      )}
    </div>
  );
};

export default RosterTable;
