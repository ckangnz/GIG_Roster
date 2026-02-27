import { useCallback } from "react";

import {
  Position,
  Team,
  AppUser,
  RosterEntry,
  TeamAssignments,
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
} from "../../store/slices/rosterSlice";
import { showAlert, setFocusedCell } from "../../store/slices/uiSlice";
import { useAppDispatch } from "../redux";

export const useRosterActions = (
  teamName?: string,
  activePosition?: string,
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
      return !!(entry && entry.absence && entry.absence[userEmail]);
    },
    [entries],
  );

  const getAbsenceReason = useCallback(
    (dateString: string, userEmail: string) => {
      const entry = entries[dateString];
      return entry?.absence?.[userEmail]?.reason || "";
    },
    [entries],
  );

  const isCellDisabled = useCallback(
    (dateString: string, userEmail: string) => {
      if (
        !teamName ||
        !activePosition ||
        activePosition === "Absence" ||
        activePosition === "All"
      )
        return false;
      if (isUserAbsent(dateString, userEmail)) return true;

      const entry = entries[dateString];
      const currentTeam = allTeams.find((t) => t.name === teamName);
      const maxConflict = currentTeam?.maxConflict || 1;

      if (
        !entry ||
        !entry.teams[teamName] ||
        !entry.teams[teamName][userEmail]
      )
        return false;

      const userAssignments = entry.teams[teamName][userEmail];
      if (!Array.isArray(userAssignments)) return false;

      const children = allPositions.filter(
        (p) => p.parentId === activePosition,
      );
      const positionGroupNames = [
        activePosition,
        ...children.map((c) => c.name),
      ];

      if (userAssignments.some((p) => positionGroupNames.includes(p)))
        return false;
      return userAssignments.length >= maxConflict;
    },
    [teamName, activePosition, isUserAbsent, entries, allTeams, allPositions],
  );

  const handleCellClick = useCallback(
    (dateString: string, userEmail: string, row: number, col: number) => {
      if (
        activePosition === "Absence" ||
        activePosition === "All" ||
        !teamName ||
        !activePosition
      )
        return;

      const isMe = userEmail === userData?.email;
      const isAdmin = userData?.isAdmin;

      const performUpdate = () => {
        if (isCellDisabled(dateString, userEmail)) {
          dispatch(setFocusedCell({ row, col, table: "roster" }));
          return;
        }
        dispatch(setFocusedCell({ row, col, table: "roster" }));

        const entry = entries[dateString];
        const userAssignments = entry?.teams[teamName]?.[userEmail] || [];
        const children = allPositions.filter(
          (p) => p.parentId === activePosition,
        );
        const positionGroupNames: string[] = [
          activePosition,
          ...children.map((c) => c.name),
        ];

        const currentInGroupIndex = positionGroupNames.findIndex((p) =>
          userAssignments.includes(p),
        );
        const currentInGroupName =
          currentInGroupIndex >= 0
            ? positionGroupNames[currentInGroupIndex]
            : null;

        let nextPositionName: string | null = null;
        if (currentInGroupName === null) {
          nextPositionName = positionGroupNames[0];
        } else if (currentInGroupIndex < positionGroupNames.length - 1) {
          nextPositionName = positionGroupNames[currentInGroupIndex + 1];
        } else {
          nextPositionName = null;
        }

        const updatedAssignments = userAssignments.filter(
          (p) => !positionGroupNames.includes(p),
        );
        if (nextPositionName) {
          updatedAssignments.push(nextPositionName);
        }

        const payload = {
          date: dateString,
          teamName,
          userIdentifier: userEmail,
          updatedAssignments,
        };

        dispatch(applyOptimisticAssignment(payload));
        dispatch(syncAssignmentRemote(payload));
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
      activePosition,
      teamName,
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
        if (targetAbsence && entry) {
          Object.entries(entry.teams).forEach(([tName, teamAssignments]) => {
            const assignments = teamAssignments as TeamAssignments;
            if (
              Array.isArray(assignments[userEmail]) &&
              assignments[userEmail].length > 0
            ) {
              clearedTeams.push(tName);
            }
          });
        }

        const payload = {
          date: dateString,
          userIdentifier: userEmail,
          isAbsent: targetAbsence,
          clearedTeams,
        };

        if (targetAbsence && clearedTeams.length > 0) {
          const teamList = clearedTeams.join(", ");
          dispatch(
            showAlert({
              title: "Clear Existing Assignments?",
              message: `User is already assigned to: ${teamList}. Marking them as absent will remove these assignments. Continue?`,
              confirmText: "Mark Absent",
              onConfirm: () => {
                dispatch(
                  applyOptimisticAbsence({
                    date: dateString,
                    userIdentifier: userEmail,
                    isAbsent: true,
                  }),
                );
                dispatch(syncAbsenceRemote(payload));
              },
            }),
          );
          return;
        }

        dispatch(
          applyOptimisticAbsence({
            date: dateString,
            userIdentifier: userEmail,
            isAbsent: targetAbsence,
          }),
        );
        dispatch(syncAbsenceRemote(payload));
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
    [isUserAbsent, entries, dispatch, userData, allTeamUsers],
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
      const payload = { date: dateString, eventName };
      dispatch(applyOptimisticEventName(payload));
      dispatch(syncEventNameRemote(payload));
    },
    [dispatch],
  );

  const handleSave = useCallback(() => {
    dispatch(updatePositions(allPositions));
  }, [dispatch, allPositions]);

  const handleCancel = useCallback(() => {
    dispatch(resetPositionsDirty());
    dispatch(fetchPositions());
    dispatch(setFocusedCell(null));
  }, [dispatch]);

  const getPeekAssignedUsers = useCallback(
    (dateString: string, peekPositionName?: string) => {
      if (!peekPositionName || !teamName) return [];
      const dateKey = dateString.split("T")[0];
      const entry = entries[dateKey];
      if (!entry || !entry.teams[teamName]) return [];

      return Object.entries(entry.teams[teamName])
        .filter(
          ([, assignments]) =>
            Array.isArray(assignments) && assignments.includes(peekPositionName),
        )
        .map(([email]) => {
          const user = allTeamUsers.find((u) => u.email === email);
          return user?.name || email;
        });
    },
    [teamName, entries, allTeamUsers],
  );

  const getConflictStatus = useCallback(
    (dateString: string, userEmail: string) => {
      const entry = entries[dateString];
      if (!entry) return { hasConflict: false, count: 0 };

      let totalAssignments = 0;
      let teamCount = 0;
      let overLimitInAnyTeam = false;

      Object.entries(entry.teams).forEach(([tName, teamData]) => {
        const assignments = teamData[userEmail];
        if (Array.isArray(assignments) && assignments.length > 0) {
          totalAssignments += assignments.length;
          teamCount++;

          const teamConfig = allTeams.find((t) => t.name === tName);
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
  };
};
