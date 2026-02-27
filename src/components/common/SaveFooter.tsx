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
}: SaveFooterProps) => {
  return (
    <div className={styles.rosterSaveFooter}>
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
