import { memo, ReactNode } from "react";

import BaseRosterCell from "./BaseRosterCell";
import styles from "../roster-cell.module.css";

interface CustomLabelCellProps {
  rowIndex: number;
  isFocused: boolean;
  onFocus?: () => void;
  identifier: string;
  dateString: string;
  content: ReactNode;
  onClick?: () => void;
}

const CustomLabelCell = memo(({
  rowIndex,
  isFocused,
  onFocus,
  identifier,
  dateString,
  content,
  onClick,
}: CustomLabelCellProps) => {
  return (
    <BaseRosterCell
      rowIndex={rowIndex}
      isFocused={isFocused}
      onFocus={onFocus}
      identifier={identifier}
      dateString={dateString}
      className={styles.clickable}
      tabIndex={content ? 0 : -1}
      onClick={onClick}
    >
      {content}
    </BaseRosterCell>
  );
});

export default CustomLabelCell;
