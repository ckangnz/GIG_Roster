import { memo, useState } from "react";

import { useNavigate } from "react-router-dom";

import ActionSheet from "../../components/common/ActionSheet";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { formatDisplayDate, getAssignmentsForTeam } from "../../model/model";
import { selectQualifiedCoverageRequests } from "../../store/selectors/rosterSelectors";
import { 
  syncAssignmentRemote, 
  applyOptimisticAssignment, 
  applyOptimisticResolve, 
  resolveCoverageRequestRemote,
  applyOptimisticAbsence,
  syncAbsenceRemote 
} from "../../store/slices/rosterSlice";

import styles from "./team-needs.module.css";

const TeamNeeds = memo(() => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const qualifiedRequests = useAppSelector(selectQualifiedCoverageRequests);
  const { userData } = useAppSelector((state) => state.auth);
  const { entries } = useAppSelector((state) => state.roster);
  const { teams: allTeams } = useAppSelector((state) => state.teams);
  const { positions: allPositions } = useAppSelector((state) => state.positions);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (qualifiedRequests.length === 0) return null;

  const handleClaim = (date: string, teamName: string, positionName: string, requestId: string) => {
    if (!userData?.email) return;

    const entry = entries[date];
    const teamAssignments = entry ? getAssignmentsForTeam(entry, teamName) : {};
    const currentAssignments = teamAssignments[userData.email] || [];
    
    if (currentAssignments.includes(positionName)) return;

    const updatedAssignments = [...currentAssignments, positionName];

    // 1. Assign the user
    const assignmentPayload = {
      date,
      teamName,
      userIdentifier: userData.email,
      updatedAssignments,
    };
    dispatch(applyOptimisticAssignment(assignmentPayload));
    dispatch(syncAssignmentRemote(assignmentPayload));

    // 2. Resolve the request
    const resolvePayload = {
      date,
      requestId,
      status: "resolved" as const,
      resolvedByEmail: userData.email,
    };
    dispatch(applyOptimisticResolve(resolvePayload));
    dispatch(resolveCoverageRequestRemote(resolvePayload));

    // 3. Clear Absence if it exists for this user on this day
    if (entry?.absence?.[userData.email]) {
      const absencePayload = {
        date,
        userIdentifier: userData.email,
        isAbsent: false,
        clearedTeams: [],
        clearedPositions: {},
      };
      dispatch(applyOptimisticAbsence(absencePayload));
      dispatch(syncAbsenceRemote(absencePayload));
    }
  };

  const handleDismiss = (date: string, requestId: string) => {
    const resolvePayload = {
      date,
      requestId,
      status: "dismissed" as const,
    };
    dispatch(applyOptimisticResolve(resolvePayload));
    dispatch(resolveCoverageRequestRemote(resolvePayload));
  };

  return (
    <>
      <button 
        className={styles.fab} 
        onClick={() => setIsSheetOpen(true)}
        title="View Team Coverage Needs"
      >
        <div className={styles.pulseIcon} />
        <span className={styles.fabCount}>{qualifiedRequests.length}</span>
        <span className={styles.fabLabel}>Needs</span>
      </button>

      <ActionSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Team Coverage Needs"
      >
        <div className={styles.sheetContent}>
          {qualifiedRequests.map(({ date, request, requestId }) => {
            const teamName = allTeams.find(t => t.id === request.teamName)?.name || request.teamName;
            const posName = allPositions.find(p => p.id === request.positionName || p.name === request.positionName)?.name || request.positionName;

            return (
              <div key={requestId} className={styles.card}>
                <div 
                  className={`${styles.header} ${styles.clickableHeader}`}
                  onClick={() => {
                    navigate(`/app/roster/${request.teamName}/${request.positionName}?date=${date}`);
                    setIsSheetOpen(false);
                  }}
                >
                  <div className={styles.dateInfo}>
                    <span className={styles.date}>{formatDisplayDate(date)}</span>
                    <span className={styles.teamPos}>{teamName} • {posName}</span>
                  </div>
                </div>
                
                <div className={styles.absentInfo}>
                  <span className={styles.absentName}>{request.absentUserName}</span> is absent.
                </div>

                <div className={styles.actions}>
                  <button 
                    className={styles.claimBtn}
                    onClick={() => {
                      handleClaim(date, request.teamName, request.positionName, requestId);
                      if (qualifiedRequests.length <= 1) setIsSheetOpen(false);
                    }}
                  >
                    Claim Shift
                  </button>
                  {userData?.isAdmin && (
                    <button 
                      className={styles.dismissBtn}
                      onClick={() => {
                        handleDismiss(date, requestId);
                        if (qualifiedRequests.length <= 1) setIsSheetOpen(false);
                      }}
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ActionSheet>
    </>
  );
});

export default TeamNeeds;
