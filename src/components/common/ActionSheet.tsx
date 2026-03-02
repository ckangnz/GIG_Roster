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

const ActionSheet = ({
  isOpen,
  onClose,
  title,
  children,
}: ActionSheetProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";

      const handleFocus = () => {
        if (contentRef.current) {
          if (
            document.activeElement &&
            contentRef.current.contains(document.activeElement)
          ) {
            return;
          }

          const focusable = contentRef.current.querySelector(
            "textarea[autofocus], input[autofocus], textarea, input, select, button",
          ) as HTMLElement;

          if (focusable) {
            focusable.focus();
            focusable.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      };

      const timer = setTimeout(handleFocus, 400);

      const handleViewportChange = () => {
        if (window.visualViewport && overlayRef.current) {
          overlayRef.current.style.height = `${window.visualViewport.height}px`;
        }
      };

      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", handleViewportChange);
        window.visualViewport.addEventListener("scroll", handleViewportChange);
      }

      return () => {
        clearTimeout(timer);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener(
            "resize",
            handleViewportChange,
          );
          window.visualViewport.removeEventListener(
            "scroll",
            handleViewportChange,
          );
        }
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose} ref={overlayRef}>
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
    document.body,
  );
};

export default ActionSheet;
