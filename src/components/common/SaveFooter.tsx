import { useTranslation } from "react-i18next";

import styles from "./save-footer.module.css";

interface SaveFooterProps {
  label?: string;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isDisabled?: boolean;
  saveText?: string;
  discardText?: string;
  hasSideNav?: boolean;
}

const SaveFooter = ({
  label,
  onSave,
  onCancel,
  isSaving,
  isDisabled = false,
  saveText,
  discardText,
}: SaveFooterProps) => {
  const { t } = useTranslation();

  const displayLabel =
    label ||
    t("common.unsavedChanges", { defaultValue: "You have unsaved changes" });
  const displaySave = saveText || t("common.save");
  const displayDiscard =
    discardText || t("common.cancel", { defaultValue: "Discard" });

  return (
    <div className={styles.rosterSaveFooter}>
      <div className={styles.saveFooterContent}>
        <span className={styles.changesLabel}>{displayLabel}</span>
        <div className={styles.saveFooterActions}>
          <button
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={isSaving}
          >
            {displayDiscard}
          </button>
          <button
            className={styles.saveBtn}
            onClick={onSave}
            disabled={isSaving || isDisabled}
          >
            {isSaving ? t("common.loading") : displaySave}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveFooter;
