import React, { useEffect, useRef } from "react";

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
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      
      // Handle initial focus
      const timer = setTimeout(() => {
        if (contentRef.current) {
          const focusable = contentRef.current.querySelector(
            "input[autofocus], textarea[autofocus], input, textarea, select, button"
          ) as HTMLElement;
          if (focusable) {
            focusable.focus();
            // Ensure the focused element is scrolled into view (crucial for mobile keyboards)
            focusable.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }, 300); // Wait for slide-up animation to finish
      
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={styles.sheet} 
        onClick={(e) => e.stopPropagation()}
        ref={contentRef}
      >
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
