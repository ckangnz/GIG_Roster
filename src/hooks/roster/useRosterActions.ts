import { useCallback } from "react";

import {
  Position,
  Team,
  AppUser,
  RosterEntry,
  getAssignmentsForTeam,
  isTeamRosterData,
  getAbsenceForUser,
} from "../../model/model";
import {
  updatePositions,
  resetPositionsDirty,
  fetchPositions,
} from "../../store/slices/positionsSlice";
import {
  applyOptimisticAssignment,
  applyOptimisticAbsence,
  applyOptimisticEventName,
  syncAssignmentRemote,
  syncAbsenceRemote,
  syncEventNameRemote,
  applyOptimisticResolve,
  resolveCoverageRequestRemote,
} from "../../store/slices/rosterSlice";
import { showAlert, setFocusedCell } from "../../store/slices/uiSlice";
import { pushAction } from "../../store/slices/undoSlice";
import { useAppDispatch } from "../redux";

export const useRosterActions = (
  teamId?: string,
  activePositionId?: string,
  allPositions: Position[] = [],
  allTeams: Team[] = [],
  entries: Record<string, RosterEntry> = {},
  allTeamUsers: AppUser[] = [],
  userData: { email?: string | null; isAdmin?: boolean } | null = null,
) => {
  const dispatch = useAppDispatch();

  const isUserAbsent = useCallback(
    (dateString: string, userEmail: string) => {
      const entry = entries[dateString];
      return !!getAbsenceForUser(entry, userEmail);
    },
    [entries],
  );

  const getAbsenceReason = useCallback(
    (dateString: string, userEmail: string) => {
      const entry = entries[dateString];
      return getAbsenceForUser(entry, userEmail)?.reason || "";
    },
    [entries],
  );

  const isCellDisabled = useCallback(
    (dateString: string, userEmail: string, slotId?: string) => {
      if (
        !teamId ||
        !activePositionId ||
        activePositionId === "Absence" ||
        activePositionId === "All"
      )
        return false;
      if (isUserAbsent(dateString, userEmail)) return true;

      const entry = entries[dateString];
      const currentTeam = allTeams.find((t) => t.id === teamId);
      const maxConflict = currentTeam?.maxConflict || 1;

      if (!entry || !entry.teams[teamId]) return false;

      const teamData = entry.teams[teamId];
      let userAssignments: string[] = [];

      if (isTeamRosterData(teamData) && teamData.type === 'slotted' && slotId) {
        userAssignments = teamData.slots?.[slotId]?.[userEmail] || [];
      } else {
        const teamAssignments = getAssignmentsForTeam(entry, teamId);
        userAssignments = teamAssignments[userEmail] || [];
      }

      if (!Array.isArray(userAssignments)) return false;

      const children = allPositions.filter(
        (p) => p.parentId === activePositionId,
      );
      const positionGroupIds = [
        activePositionId,
        ...children.map((c) => c.id),
      ];

      if (userAssignments.some((p) => positionGroupIds.includes(p)))
        return false;
      return userAssignments.length >= maxConflict;
    },
    [teamId, activePositionId, isUserAbsent, entries, allTeams, allPositions],
  );

  const handleCellClick = useCallback(
    (dateString: string, userEmail: string, row: number, col: number, slotId?: string) => {
      if (
        activePositionId === "Absence" ||
        activePositionId === "All" ||
        !teamId ||
        !activePositionId
      )
        return;

      const isMe = userEmail === userData?.email;
      const isAdmin = userData?.isAdmin;

      const performUpdate = () => {
        if (isCellDisabled(dateString, userEmail, slotId)) {
          dispatch(setFocusedCell({ row, col, table: "roster" }));
          return;
        }
        dispatch(setFocusedCell({ row, col, table: "roster" }));

        const entry = entries[dateString];
        const teamData = entry?.teams[teamId];
        let userAssignments: string[] = [];

        if (teamData && isTeamRosterData(teamData) && teamData.type === 'slotted' && slotId) {
          userAssignments = teamData.slots?.[slotId]?.[userEmail] || [];
        } else {
          const teamAssignments = entry ? getAssignmentsForTeam(entry, teamId) : {};
          userAssignments = teamAssignments[userEmail] || [];
        }

        // --- UNDO INTEGRATION ---
        const targetUserName = allTeamUsers.find(u => u.email === userEmail)?.name || userEmail;
        dispatch(pushAction({
          id: crypto.randomUUID(),
          type: 'assignment',
          timestamp: Date.now(),
          payload: {
            date: dateString,
            teamName: teamId,
            userEmail,
            previousAssignments: userAssignments,
            slotId, // Pass slotId to undo payload
          },
          description: `Updated assignment for ${targetUserName}`
        }));

        const children = allPositions.filter(
          (p) => p.parentId === activePositionId,
        );
        const positionGroupIds: string[] = [
          activePositionId,
          ...children.map((c) => c.id),
        ];

        const currentInGroupIndex = positionGroupIds.findIndex((p) =>
          userAssignments.includes(p),
        );
        const currentInGroupId =
          currentInGroupIndex >= 0
            ? positionGroupIds[currentInGroupIndex]
            : null;

        let nextPositionId: string | null = null;
        if (currentInGroupId === null) {
          nextPositionId = positionGroupIds[0];
        } else if (currentInGroupIndex < positionGroupIds.length - 1) {
          nextPositionId = positionGroupIds[currentInGroupIndex + 1];
        } else {
          nextPositionId = null;
        }

        const updatedAssignments = userAssignments.filter(
          (p) => !positionGroupIds.includes(p),
        );
        if (nextPositionId) {
          updatedAssignments.push(nextPositionId);
        }

        const payload = {
          date: dateString,
          teamName: teamId,
          userIdentifier: userEmail,
          updatedAssignments,
          slotId, // Include slotId in sync payload
        };

        dispatch(applyOptimisticAssignment(payload));
        dispatch(syncAssignmentRemote(payload));

        // --- TEAM NEEDS INTEGRATION: RESOLVE ON ASSIGNMENT ---
        if (nextPositionId && entry?.coverageRequests) {
          const groupIds = [activePositionId, nextPositionId, ...children.map(c => c.id)];

          Object.entries(entry.coverageRequests).forEach(([reqId, req]) => {
            // Resolve if matches team, position group, AND same slot (if applicable)
            const matchesSlot = !slotId || req.slotId === slotId;
            if (req.status === "open" && req.teamName === teamId && groupIds.includes(req.positionName) && matchesSlot) {
              const resolvePayload = {
                date: dateString,
                requestId: reqId,
                status: "resolved" as const,
                resolvedByEmail: userData?.email || userEmail,
              };
              dispatch(applyOptimisticResolve(resolvePayload));
              dispatch(resolveCoverageRequestRemote(resolvePayload));
            }
          });
        }

        // 2. Automatically clear Chris's absence if he's claiming his own slot
        if (nextPositionId && entry?.absence?.[userEmail]) {
          const absencePayload = {
            date: dateString,
            userIdentifier: userEmail,
            isAbsent: false,
            clearedTeams: [],
            clearedPositions: {},
          };
          dispatch(applyOptimisticAbsence(absencePayload));
          dispatch(syncAbsenceRemote(absencePayload));
        }
      };

      if (!isMe && !isAdmin) {
        const targetUser = allTeamUsers.find((u) => u.email === userEmail);
        dispatch(
          showAlert({
            title: "Edit Teammate's Roster?",
            message: `You are about to change ${targetUser?.name || userEmail}'s assignment. Please ensure you have coordinated this swap with them.`,
            confirmText: "Change Assignment",
            onConfirm: performUpdate,
          }),
        );
      } else {
        performUpdate();
      }
    },
    [
      activePositionId,
      teamId,
      isCellDisabled,
      entries,
      allPositions,
      dispatch,
      userData,
      allTeamUsers,
    ],
  );

  const handleAbsenceClick = useCallback(
    (dateString: string, userEmail: string, row: number, col: number) => {
      const isMe = userEmail === userData?.email;
      const isAdmin = userData?.isAdmin;

      const performUpdate = () => {
        dispatch(setFocusedCell({ row, col, table: "absence" }));
        const isCurrentlyAbsent = isUserAbsent(dateString, userEmail);
        const targetAbsence = !isCurrentlyAbsent;

        const entry = entries[dateString];
        const clearedTeams: string[] = [];
        const clearedPositions: Record<string, string[]> = {};
        
        if (targetAbsence && entry) {
          Object.keys(entry.teams).forEach((tId) => {
            const teamAssignments = getAssignmentsForTeam(entry, tId);
            if (
              Array.isArray(teamAssignments[userEmail]) &&
              teamAssignments[userEmail].length > 0
            ) {
              clearedTeams.push(tId);
              clearedPositions[tId] = teamAssignments[userEmail];
            }
          });
        }

        const payload = {
          date: dateString,
          userIdentifier: userEmail,
          isAbsent: targetAbsence,
          clearedTeams,
          absentUserName: allTeamUsers.find(u => u.email === userEmail)?.name || userEmail,
          clearedPositions,
        };

        const userName = allTeamUsers.find(u => u.email === userEmail)?.name || userEmail;
        dispatch(pushAction({
          id: crypto.randomUUID(),
          type: 'absence',
          timestamp: Date.now(),
          payload: {
            date: dateString,
            userEmail,
            previousIsAbsent: isCurrentlyAbsent,
            previousReason: getAbsenceReason(dateString, userEmail),
            restoredAssignments: targetAbsence ? clearedPositions : undefined,
          },
          description: `${targetAbsence ? 'Marked' : 'Removed'} absence for ${userName}`
        }));

        if (targetAbsence && Object.keys(clearedPositions).length > 0) {
          const formattedAssignments = Object.entries(clearedPositions).map(([tId, posIds]) => {
            const team = allTeams.find(t => t.id === tId);
            const positionNames = posIds.map(pId => {
              const pos = allPositions.find(p => p.id === pId || p.name === pId);
              return pos?.name || pId;
            }).join(", ");
            return `${team?.name || tId} (${positionNames})`;
          }).join(", ");

          const absentUserNameForAlert = allTeamUsers.find(u => u.email === userEmail)?.name || userEmail;
          dispatch(
            showAlert({
              title: "Clear Existing Assignments?",
              message: `${absentUserNameForAlert} is already assigned to: ${formattedAssignments}. Marking them as absent will remove these assignments. Continue?`,
              confirmText: "Mark Absent",
              onConfirm: () => {
                dispatch(
                  applyOptimisticAbsence({
                    date: dateString,
                    userIdentifier: userEmail,
                    isAbsent: true,
                    clearedPositions,
                    userName: absentUserNameForAlert,
                  }),
                );
                dispatch(syncAbsenceRemote(payload));
              },
            }),
          );
          return;
        }

        const currentUserName = allTeamUsers.find(u => u.email === userEmail)?.name || userEmail;
        dispatch(
          applyOptimisticAbsence({
            date: dateString,
            userIdentifier: userEmail,
            isAbsent: targetAbsence,
            clearedPositions: targetAbsence ? clearedPositions : undefined,
            userName: currentUserName,
          }),
        );
        dispatch(syncAbsenceRemote(payload));

        if (!targetAbsence && entry?.coverageRequests) {
          Object.entries(entry.coverageRequests).forEach(([reqId, req]) => {
            if (req.status === "open" && req.absentUserEmail === userEmail) {
              const resolvePayload = {
                date: dateString,
                requestId: reqId,
                status: "resolved" as const,
                resolvedByEmail: userData?.email || userEmail,
              };
              dispatch(applyOptimisticResolve(resolvePayload));
              dispatch(resolveCoverageRequestRemote(resolvePayload));
            }
          });
        }
      };

      if (!isMe && !isAdmin) {
        const targetUser = allTeamUsers.find((u) => u.email === userEmail);
        dispatch(
          showAlert({
            title: "Update Teammate's Absence?",
            message: `You are about to mark ${targetUser?.name || userEmail} as ${isUserAbsent(dateString, userEmail) ? "present" : "absent"}. Confirm if this was requested.`,
            confirmText: "Update Absence",
            onConfirm: performUpdate,
          }),
        );
      } else {
        performUpdate();
      }
    },
    [isUserAbsent, entries, dispatch, userData, allTeamUsers, getAbsenceReason, allPositions, allTeams],
  );

  const handleAbsenceReasonChange = useCallback(
    (dateString: string, userEmail: string, reason: string) => {
      const payload = {
        date: dateString,
        userIdentifier: userEmail,
        reason,
        isAbsent: true,
        clearedTeams: [],
      };
      dispatch(applyOptimisticAbsence(payload));
      dispatch(syncAbsenceRemote(payload));
    },
    [dispatch],
  );

  const handleEventNameChange = useCallback(
    (dateString: string, eventName: string) => {
      const entry = entries[dateString];
      const previousEventName = entry?.eventName || "";

      dispatch(pushAction({
        id: crypto.randomUUID(),
        type: 'eventName',
        timestamp: Date.now(),
        payload: {
          date: dateString,
          previousEventName,
        },
        description: `Updated event name for ${dateString}`
      }));

      const payload = { date: dateString, eventName };
      dispatch(applyOptimisticEventName(payload));
      dispatch(syncEventNameRemote(payload));
    },
    [dispatch, entries],
  );

  const handleSave = useCallback(() => {
    // Note: updatePositions handles orgId internally via getState(), 
    // but we can pass it if we update the thunk signature later.
    // For now, the existing thunk reads from state.
    dispatch(updatePositions(allPositions));
  }, [dispatch, allPositions]);

  const handleCancel = useCallback(() => {
    dispatch(resetPositionsDirty());
    const orgId = (userData as AppUser)?.orgId;
    if (orgId) {
      dispatch(fetchPositions(orgId));
    }
    dispatch(setFocusedCell(null));
  }, [dispatch, userData]);

  const getPeekAssignedUsers = useCallback(
    (dateString: string, peekPositionId?: string) => {
      if (!peekPositionId || !teamId) return [];
      const dateKey = dateString.split("T")[0];
      const entry = entries[dateKey];
      if (!entry || !entry.teams[teamId]) return [];

      const teamAssignments = getAssignmentsForTeam(entry, teamId);

      return Object.entries(teamAssignments)
        .filter(
          ([, assignments]) =>
            Array.isArray(assignments) && assignments.includes(peekPositionId),
        )
        .map(([email]) => {
          const user = allTeamUsers.find((u) => u.email === email);
          return user?.name || email;
        });
    },
    [teamId, entries, allTeamUsers],
  );

  const getConflictStatus = useCallback(
    (dateString: string, userEmail: string) => {
      const entry = entries[dateString];
      if (!entry) return { hasConflict: false, count: 0 };

      let totalAssignments = 0;
      let teamCount = 0;
      let overLimitInAnyTeam = false;

      Object.keys(entry.teams).forEach((tId) => {
        const teamAssignments = getAssignmentsForTeam(entry, tId);
        const assignments = teamAssignments[userEmail];
        if (Array.isArray(assignments) && assignments.length > 0) {
          totalAssignments += assignments.length;
          teamCount++;

          const teamConfig = allTeams.find((t) => t.id === tId);
          if (teamConfig && assignments.length > teamConfig.maxConflict) {
            overLimitInAnyTeam = true;
          }
        }
      });

      return {
        hasConflict: teamCount > 1 || overLimitInAnyTeam || totalAssignments > 1,
        teamCount,
        totalAssignments,
        overLimit: overLimitInAnyTeam
      };
    },
    [entries, allTeams],
  );

  const hasPositionCoverageRequest = useCallback(
    (dateString: string, tId: string, pId: string) => {
      const entry = entries[dateString];
      if (!entry?.coverageRequests) return false;

      return Object.values(entry.coverageRequests).some(
        (req) => req.teamName === tId && req.positionName === pId && req.status === "open"
      );
    },
    [entries]
  );

  return {
    isUserAbsent,
    getAbsenceReason,
    handleCellClick,
    handleAbsenceClick,
    handleAbsenceReasonChange,
    handleEventNameChange,
    handleSave,
    handleCancel,
    isCellDisabled,
    getPeekAssignedUsers,
    getConflictStatus,
    hasPositionCoverageRequest,
  };
};
