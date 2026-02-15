import { useAppSelector } from "../../hooks/redux";

import styles from "./save-footer.module.css";

interface SaveFooterProps {
  label?: string;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  saveText?: string;
  discardText?: string;
  hasSideNav?: boolean;
}

const SaveFooter = ({
  label = "You have unsaved changes",
  onSave,
  onCancel,
  isSaving,
  saveText = "Save",
  discardText = "Discard",
  hasSideNav = true,
}: SaveFooterProps) => {
  const { isDesktopSidebarExpanded } = useAppSelector((state) => state.ui);

  const footerClasses = [
    styles.rosterSaveFooter,
    !hasSideNav ? styles.noSidebar : "",
    !isDesktopSidebarExpanded && hasSideNav ? styles.sidebarCollapsed : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={footerClasses}>
      <div className={styles.saveFooterContent}>
        <span className={styles.changesLabel}>{label}</span>
        <div className={styles.saveFooterActions}>
          <button
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={isSaving}
          >
            {discardText}
          </button>
          <button
            className={styles.saveBtn}
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : saveText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveFooter;
