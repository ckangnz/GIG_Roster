import { ReactNode, memo, useEffect, useRef, useMemo } from "react";

import { useParams } from "react-router-dom";

import { resolvePresenceColor } from "../../../hooks/presenceUtils";
import { useAppSelector } from "../../../hooks/redux";
import { currentSessionId } from "../../../hooks/usePresence";
import { useTheme } from "../../../hooks/useThemeHook";
import styles from "../roster-cell.module.css";

export interface BaseRosterCellProps {
  rowIndex: number;
  isFocused: boolean;
  onFocus?: () => void;
  identifier: string;
  dateString: string;
  className?: string;
  tabIndex?: number;
  onClick?: () => void;
  children: ReactNode;
  title?: string;
  isHighlighted?: boolean;
  isAssignedOnClosestDate?: boolean;
}

const BaseRosterCell = memo(({
  isFocused,
  onFocus,
  identifier,
  dateString,
  className = "",
  tabIndex = -1,
  onClick,
  children,
  title,
  isHighlighted,
  isAssignedOnClosestDate,
}: BaseRosterCellProps) => {
  const cellRef = useRef<HTMLTableCellElement>(null);
  const { teamName } = useParams();
  const { onlineUsers } = useAppSelector(state => state.presence);
  const { firebaseUser } = useAppSelector(state => state.auth);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (isFocused && cellRef.current) {
      cellRef.current.focus();
      cellRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [isFocused]);

  const remoteCursors = useMemo(() => {
    return onlineUsers.filter(u => {
      const isOtherSession = u.uid !== `${firebaseUser?.uid}_${currentSessionId}`;
      return isOtherSession && 
        u.focus?.date === dateString &&
        u.focus?.identifier === identifier &&
        u.focus?.teamName === teamName;
    });
  }, [onlineUsers, dateString, identifier, teamName, firebaseUser?.uid]);

  const combinedClasses = [
    styles.rosterCell,
    isFocused ? styles.focused : "",
    isAssignedOnClosestDate ? styles.highlightedCell : "",
    isHighlighted ? styles.cellWithHighlightedUser : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <td
      ref={cellRef}
      className={combinedClasses}
      tabIndex={tabIndex}
      onClick={onClick}
      onFocus={onFocus}
      title={title}
    >
      {remoteCursors.map((u, idx) => {
        const userColor = resolvePresenceColor(u.colorIndex, u.color, isDark);
        return (
          <div 
            key={u.uid} 
            className={styles.remoteCursorBorder} 
            style={{ 
              borderColor: userColor,
              transform: `translate(${idx * 2}px, ${idx * 2}px)` 
            }}
          >
            <div className={styles.remoteCursorBadge} style={{ backgroundColor: userColor }}>
              {u.name}
            </div>
          </div>
        );
      })}
      {children}
    </td>
  );
});

export default BaseRosterCell;
