import React, { useEffect } from "react";

import { X } from "lucide-react";
import { createPortal } from "react-dom";

import styles from "./action-sheet.module.css";

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const ActionSheet = ({ isOpen, onClose, title, children }: ActionSheetProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default ActionSheet;
