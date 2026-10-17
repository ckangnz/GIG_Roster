import {
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useTranslation } from "react-i18next";

import BaseRosterCell from "./BaseRosterCell";
import { useLongPress } from "../../../hooks/useLongPress";
import { AppUser, Team } from "../../../model/model";
import styles from "../roster-cell.module.css";

interface UserAssignmentCellProps {
  rowIndex: number;
  isFocused: boolean;
  onFocus?: () => void;
  identifier: string;
  dateString: string;
  content: ReactNode;
  supplementalContent?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  absent?: boolean;
  absenceReason?: string;
  isAssignedOnClosestDate?: boolean;
  isHighlighted?: boolean;
  hasConflict?: boolean;
  conflictDescription?: string;
  userData?: (AppUser & { isAdmin?: boolean }) | null;
  allTeams?: Team[];
  teamName?: string;
  activePosition?: string;
  hasOpenPositionRequest?: boolean;
}

const UserAssignmentCell = memo(
  ({
    rowIndex,
    isFocused,
    onFocus,
    identifier,
    dateString,
    content,
    supplementalContent,
    onClick,
    disabled,
    absent,
    absenceReason,
    isAssignedOnClosestDate,
    isHighlighted,
    hasConflict,
    conflictDescription,
    userData,
    hasOpenPositionRequest = false,
  }: UserAssignmentCellProps) => {
    const { t } = useTranslation();
    const hasContent = !!content || absent;
    const isMe = identifier === userData?.email;
    const isAdmin = !!userData?.isAdmin;
    const cellContentRef = useRef<HTMLDivElement>(null);
    const suppressNextClickRef = useRef(false);
    const [showConflictDetails, setShowConflictDetails] = useState(false);
    const canShowConflictDetails = !!hasConflict && !absent;

    const openConflictDetails = useCallback(() => {
      suppressNextClickRef.current = true;
      setShowConflictDetails(true);
    }, []);

    const longPressHandlers = useLongPress(
      openConflictDetails,
      canShowConflictDetails,
    );

    useEffect(() => {
      if (!showConflictDetails) return;
      const closeConflictDetails = (event: PointerEvent) => {
        suppressNextClickRef.current = !!cellContentRef.current
          ?.closest("td")
          ?.contains(event.target as Node);
        setShowConflictDetails(false);
      };
      document.addEventListener("pointerdown", closeConflictDetails, true);
      return () =>
        document.removeEventListener("pointerdown", closeConflictDetails, true);
    }, [showConflictDetails]);

    const handleClick = () => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        return;
      }
      onClick?.();
    };

    // Logic to determine if "Claim Shift" should show
    // 1. Cell must be empty (no content and not absent)
    // 2. The row MUST have an open coverage request for this specific position
    // 3. Admin sees it for everyone, non-admin only for themselves
    const canClaim = !hasContent && hasOpenPositionRequest && (isAdmin || isMe);

    const className = [
      !disabled || canClaim ? styles.clickable : styles.disabled,
      absent ? styles.absentStrike : "",
      canClaim ? styles.canClaimRow : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <BaseRosterCell
        rowIndex={rowIndex}
        isFocused={isFocused}
        onFocus={onFocus}
        identifier={identifier}
        dateString={dateString}
        className={className}
        tabIndex={hasContent || canClaim ? 0 : -1}
        onClick={!disabled || canClaim ? handleClick : undefined}
        pointerHandlers={longPressHandlers}
        isAssignedOnClosestDate={isAssignedOnClosestDate}
        isHighlighted={isHighlighted}
      >
        <div ref={cellContentRef} className={styles.cellContent}>
          {canShowConflictDetails && (
            <div
              className={styles.conflictIndicator}
              title={conflictDescription || t("roster.conflictTitle")}
            />
          )}
          {canShowConflictDetails && showConflictDetails && (
            <div
              className={`${styles.reasonPopover} ${styles.conflictPopover} ${rowIndex === 0 ? styles.popoverBottom : ""}`}
            >
              {conflictDescription || t("roster.conflictTitle")}
            </div>
          )}
          {absent && isFocused && (
            <div
              className={`${styles.reasonPopover} ${rowIndex === 0 ? styles.popoverBottom : ""}`}
            >
              {absenceReason || (
                <span className={styles.noReason}>No reason provided</span>
              )}
            </div>
          )}
          {absent ? (
            <span title={absenceReason}>❌</span>
          ) : content ? (
            content
          ) : canClaim ? (
            <div
              className={`${styles.claimButtonContainer} ${styles.permanentClaim}`}
            >
              <span className={styles.claimText}>{t("roster.claim")}</span>
            </div>
          ) : null}
        </div>
        {supplementalContent}
      </BaseRosterCell>
    );
  },
);

export default UserAssignmentCell;
