import { ReactNode, memo, useEffect, useRef, useMemo } from "react";

import { X } from "lucide-react";
import { useParams } from "react-router-dom";

import { resolvePresenceColor } from "../../hooks/presenceUtils";
import { useAppSelector } from "../../hooks/redux";
import { currentSessionId } from "../../hooks/usePresence";
import { useTheme } from "../../hooks/useThemeHook";

import absenceStyles from "./AbsenceRoster/absence-roster.module.css";
import styles from "./roster-cell.module.css";

interface RosterCellProps {
  type: "all-user" | "all-position" | "roster-custom" | "roster-user" | "absence";
  rowIndex: number;
  isFocused: boolean;
  onFocus: () => void;
  identifier: string; // email or custom label
  dateString: string;
  // All View
  id?: string;
  absent?: boolean;
  absenceReason?: string;
  isAssignedOnClosestDate?: boolean;
  isHighlighted?: boolean;
  content?: ReactNode;
  onClick?: () => void;
  // Absence View
  handleAbsenceReasonChange?: (reason: string) => void;
  // Roster View
  disabled?: boolean;
}

const RosterCell = memo(({
  type,
  rowIndex,
  isFocused,
  onFocus,
  identifier,
  dateString,
  absent,
  absenceReason,
  isAssignedOnClosestDate,
  isHighlighted,
  content,
  onClick,
  handleAbsenceReasonChange,
  disabled,
}: RosterCellProps) => {
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

  // Find other users focusing on this cell
  const remoteCursors = useMemo(() => {
    return onlineUsers.filter(u => {
      // Allow showing cursor if it's a different session, even if it's the same user (multi-tab/browser)
      const isOtherSession = u.uid !== `${firebaseUser?.uid}_${currentSessionId}`;
      
      return isOtherSession && 
        u.focus?.date === dateString &&
        u.focus?.identifier === identifier &&
        u.focus?.teamName === teamName;
    });
  }, [onlineUsers, dateString, identifier, teamName, firebaseUser?.uid]);

  const hasContent = !!content || absent;

  const commonClasses = [
    styles.rosterCell,
    isFocused && type !== "all-position" ? styles.focused : "",
    isAssignedOnClosestDate ? styles.highlightedCell : "",
    isHighlighted ? styles.cellWithHighlightedUser : "",
  ];

  const renderRemoteCursors = () => {
    if (remoteCursors.length === 0) return null;
    
    return remoteCursors.map((u, idx) => {
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
    });
  };

  if (type === "all-user") {
    return (
      <td
        ref={cellRef}
        className={[
          ...commonClasses,
          hasContent ? styles.clickable : "",
          absent ? styles.absentStrike : "",
        ]
          .filter(Boolean)
          .join(" ")}
        tabIndex={hasContent ? 0 : -1}
        onClick={hasContent ? onClick : undefined}
        onFocus={hasContent ? onFocus : undefined}
      >
        {renderRemoteCursors()}
        {absent && isFocused && (
          <div className={`${styles.reasonPopover} ${rowIndex === 0 ? styles.popoverBottom : ""}`}>
            {absenceReason || <span className={styles.noReason}>No reason provided</span>}
          </div>
        )}
        {absent ? <span title={absenceReason}>❌</span> : content}
      </td>
    );
  }

  if (type === "all-position") {
    return (
      <td
        ref={cellRef}
        className={commonClasses.filter(Boolean).join(" ")}
        tabIndex={-1}
      >
        {renderRemoteCursors()}
        {content}
      </td>
    );
  }

  if (type === "roster-custom") {
    return (
      <td
        ref={cellRef}
        className={[...commonClasses, styles.clickable].filter(Boolean).join(" ")}
        onClick={onClick}
        tabIndex={hasContent ? 0 : -1}
        onFocus={onFocus}
      >
        {renderRemoteCursors()}
        {content}
      </td>
    );
  }

  if (type === "roster-user") {
    return (
      <td
        ref={cellRef}
        className={[
          ...commonClasses,
          !disabled ? styles.clickable : styles.disabled,
          absent ? styles.absentStrike : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onClick}
        tabIndex={hasContent ? 0 : -1}
        onFocus={onFocus}
      >
        {renderRemoteCursors()}
        <div className={styles.cellContent}>
          {absent && isFocused && (
            <div className={`${styles.reasonPopover} ${rowIndex === 0 ? styles.popoverBottom : ""}`}>
              {absenceReason || <span className={styles.noReason}>No reason provided</span>}
            </div>
          )}
          {absent ? <span title={absenceReason}>❌</span> : content}
        </div>
      </td>
    );
  }

  if (type === "absence") {
    return (
      <td
        ref={cellRef}
        className={[
          ...commonClasses, 
          styles.clickable, 
          absenceStyles.absenceRosterCell, 
          absent ? absenceStyles.absentCell : ""
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onClick}
        tabIndex={0}
        onFocus={onFocus}
        title={absenceReason}
      >
        {renderRemoteCursors()}
        {absent ? (
          <div className={absenceStyles.absenceInputContainer}>
            <input
              type="text"
              className={absenceStyles.absenceReasonInput}
              value={absenceReason}
              placeholder="Reason..."
              maxLength={20}
              autoFocus={isFocused}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleAbsenceReasonChange?.(e.target.value)}
            />
            <button
              className={absenceStyles.removeAbsenceBtn}
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              title="Mark as present"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          ""
        )}
      </td>
    );
  }

  return null;
});

export default RosterCell;
