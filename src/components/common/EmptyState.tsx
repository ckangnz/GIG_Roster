import React from "react";

import { useTranslation } from "react-i18next";

import Button from "./Button";

import styles from "./empty-state.module.css";

interface EmptyStateProps {
  illustration: React.ReactNode;
  title: string;
  description: string;
  instruction?: {
    label?: string;
    text: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({
  illustration,
  title,
  description,
  instruction
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <div className={styles.svgWrapper}>
        {illustration}
      </div>
      
      <h2 className={styles.reasonTitle}>{title}</h2>
      <p className={styles.description}>{description}</p>
      
      {instruction && (
        <div className={styles.instructionBox}>
          <span className={styles.instructionLabel}>
            {instruction.label || t("common.instruction", "Instruction")}
          </span>
          <p className={styles.instructionText}>{instruction.text}</p>
          
          {instruction.action && (
            <Button 
              className={styles.actionButton} 
              variant="primary" 
              size="small"
              onClick={instruction.action.onClick}
            >
              {instruction.action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
