import { useTranslation } from "react-i18next";

import Modal from "./Modal";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { hideAlert } from "../../store/slices/uiSlice";

import styles from "./confirm-modal.module.css";

const ConfirmModal = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { alertConfig } = useAppSelector((state) => state.ui);

  if (!alertConfig) return null;

  const handleClose = () => {
    dispatch(hideAlert());
  };

  const handleConfirm = () => {
    if (alertConfig.onConfirm) {
      alertConfig.onConfirm();
    }
    dispatch(hideAlert());
  };

  const footer = (
    <div className={styles.footer}>
      {alertConfig.showCancel !== false && (
        <button className={styles.cancelButton} onClick={handleClose}>
          {alertConfig.cancelText || t("common.cancel")}
        </button>
      )}
      <button className={styles.confirmButton} onClick={handleConfirm}>
        {alertConfig.confirmText || t("common.confirm", { defaultValue: "OK" })}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={!!alertConfig}
      onClose={handleClose}
      title={alertConfig.title}
      footer={footer}
    >
      <div className={styles.confirmModalBody}>
        <div className={styles.confirmModalMessage}>{alertConfig.message}</div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
