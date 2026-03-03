import { useMemo, useCallback } from "react";

import { GeneralRosterHeader } from "./GeneralRosterHeader";
import { GeneralRosterRow } from "./GeneralRosterRow";
import { useRosterBaseLogic } from "../../../hooks/useRosterBaseLogic";
import { useRosterHeaderLogic } from "../../../hooks/useRosterHeaderLogic";
import { useRosterVisualRows } from "../../../hooks/useRosterVisualRows";
import { getAssignmentsForTeam, isTeamRosterData, OrgMembership } from "../../../model/model";
import cellStyles from "../roster-cell.module.css";
import RosterTable from "../RosterTable";

const GeneralRosterTable = () => {
  const logic = useRosterBaseLogic();
  const { hasPastDates } = useRosterHeaderLogic();
  const {
    teamId,
    activePositionId,
    users,
    allPositions,
    rosterDates,
    closestNextDate,
    entries,
    hiddenUserList,
    userData,
    allTeams,
    handleCellClick,
    getConflictStatus,
    hasPositionCoverageRequest,
  } = logic;

  const currentTeam = useMemo(
    () => allTeams.find((t) => t.id === teamId),
    [allTeams, teamId],
  );
  const isSlotted = currentTeam?.rosterMode === "slotted";

  const visualRows = useRosterVisualRows(
    rosterDates,
    currentTeam || null,
    !!isSlotted,
  );

  const currentPosition = useMemo(
    () => allPositions.find((p) => p.id === activePositionId),
    [allPositions, activePositionId],
  );

  const sortedUsers = useMemo(() => {
    const orgId = userData?.orgId;
    const list = users.filter((u) => {
      const orgs = u.organisations as Record<string, OrgMembership>;
      let isActive = true;
      if (orgs && !Array.isArray(orgs) && orgId) {
        isActive = orgs[orgId]?.isActive ?? true;
      }
      return u.email && !hiddenUserList.includes(u.email) && isActive;
    });

    const sortFn = (a: (typeof list)[0], b: (typeof list)[0]) => {
      const isMeA = a.email === userData?.email;
      const isMeB = b.email === userData?.email;

      if (isMeA) return -1;
      if (isMeB) return 1;

      if (currentPosition?.sortByGender) {
        if (a.gender !== b.gender) {
          if (a.gender === "Male") return -1;
          if (b.gender === "Male") return 1;
          return (a.gender || "").localeCompare(b.gender || "");
        }
      }

      return (a.name || "").localeCompare(b.name || "");
    };

    return [...list].sort(sortFn);
  }, [users, currentPosition, hiddenUserList, userData]);

  const genderDividerIndex = useMemo(() => {
    if (!currentPosition?.sortByGender || sortedUsers.length === 0) return -1;
    const firstFemaleIndex = sortedUsers.findIndex(
      (u) => u.gender === "Female",
    );
    return firstFemaleIndex > 0 && firstFemaleIndex < sortedUsers.length
      ? firstFemaleIndex
      : -1;
  }, [currentPosition, sortedUsers]);

  const assignedOnClosestDate = useMemo(() => {
    if (!closestNextDate || !teamId || !activePositionId) return [];
    const dateKey = closestNextDate.split("T")[0];
    const entry = entries[dateKey];
    if (!entry || !entry.teams[teamId]) return [];

    const teamAssignments = getAssignmentsForTeam(entry, teamId);
    const children = allPositions.filter(
      (p) => p.parentId === activePositionId,
    );
    const positionGroupIds = [activePositionId, ...children.map((c) => c.id)];

    return Object.entries(teamAssignments)
      .filter(
        ([, positions]) =>
          Array.isArray(positions) &&
          (positions as string[]).some((p) => positionGroupIds.includes(p)),
      )
      .map(([email]) => email);
  }, [closestNextDate, teamId, activePositionId, entries, allPositions]);

  const handleKeyboardCellClick = useCallback(
    (rowIdx: number, col: number) => {
      const row = visualRows[rowIdx];
      const user = sortedUsers[col];
      if (row && user?.email) {
        handleCellClick(row.dateString, user.email, rowIdx, col, row.slot?.id);
      }
    },
    [visualRows, sortedUsers, handleCellClick],
  );

  const getCellContent = useCallback(
    (dateString: string, userEmail: string, slotId?: string) => {
      const entry = entries[dateString];
      if (!entry || !teamId) return "";

      const teamData = entry.teams[teamId];
      let currentTeamAssignments: string[] = [];

      if (teamData) {
        if (
          isTeamRosterData(teamData) &&
          teamData.type === "slotted" &&
          slotId
        ) {
          currentTeamAssignments = teamData.slots?.[slotId]?.[userEmail] || [];
        } else {
          currentTeamAssignments =
            getAssignmentsForTeam(entry, teamId)[userEmail] || [];
        }
      }

      const otherTeamsAssignments: { teamId: string; positions: string[] }[] =
        [];
      Object.entries(entry.teams).forEach(([tId]) => {
        if (tId !== teamId) {
          const assignments = getAssignmentsForTeam(entry, tId)[userEmail];
          if (Array.isArray(assignments) && assignments.length > 0) {
            otherTeamsAssignments.push({ teamId: tId, positions: assignments });
          }
        }
      });

      if (
        currentTeamAssignments.length === 0 &&
        otherTeamsAssignments.length === 0
      )
        return "";

      return (
        <>
          <div className={cellStyles.currentTeamContainer}>
            {currentTeamAssignments.map((posId) => {
              const pos = allPositions.find(
                (p) => p.id === posId || p.name === posId,
              );
              const team = allTeams.find((t) => t.id === teamId);
              return (
                <span
                  key={posId}
                  title={`${team?.name || "Team"}: ${pos?.name || posId}`}
                  className={cellStyles.currentTeamEmoji}
                >
                  {pos?.emoji || "❓"}
                </span>
              );
            })}
          </div>
          {otherTeamsAssignments.length > 0 && (
            <div className={cellStyles.otherTeamsIndicator}>
              {otherTeamsAssignments.map((ota) =>
                ota.positions.map((posId) => {
                  const pos = allPositions.find(
                    (p) => p.id === posId || p.name === posId,
                  );
                  const oTeam = allTeams.find((t) => t.id === ota.teamId);
                  return (
                    <span
                      key={`${ota.teamId}-${posId}`}
                      title={`${oTeam?.name || "Team"}: ${pos?.name || posId}`}
                      className={cellStyles.otherTeamEmoji}
                    >
                      {pos?.emoji || "❓"}
                    </span>
                  );
                }),
              )}
            </div>
          )}
        </>
      );
    },
    [entries, teamId, allPositions, allTeams],
  );

  const renderHeader = () => (
    <GeneralRosterHeader
      sortedUsers={sortedUsers}
      genderDividerIndex={genderDividerIndex}
      assignedOnClosestDate={assignedOnClosestDate}
      currentPosition={currentPosition}
      userData={userData}
      onToggleVisibility={logic.handleToggleVisibility}
      showPeek={true}
    />
  );

  return (
    <RosterTable
      {...logic}
      isAllView={false}
      isAbsenceView={false}
      hiddenUserList={hiddenUserList}
      renderHeader={renderHeader}
      onLoadNextYear={logic.handleLoadNextYear}
      colCount={sortedUsers.length + (genderDividerIndex >= 0 ? 1 : 0)}
      rowCount={visualRows.length}
      onCellClick={handleKeyboardCellClick}
      hasPastDates={hasPastDates}
    >
      {visualRows.map((row, rowIndex) => {
        const rowClass = logic.getRowClass(row.dateString);
        const isPast = rowClass === "past-date";
        const isToday = rowClass === "today-date";

        return (
          <GeneralRosterRow
            key={row.slot ? `${row.dateString}-${row.slot.id}` : row.dateString}
            dateString={row.dateString}
            rowIndex={rowIndex}
            entries={entries}
            closestNextDate={closestNextDate}
            onDateClick={logic.handleDateClick}
            focusedCell={logic.focusedCell}
            setFocusedCell={logic.setFocusedCell}
            handleCellClick={(date, email, r, c) =>
              handleCellClick(date, email, r, c, row.slot?.id)
            }
            getCellContent={(date, email) =>
              getCellContent(date, email, row.slot?.id)
            }
            sortedUsers={sortedUsers}
            genderDividerIndex={genderDividerIndex}
            isCellDisabled={logic.isCellDisabled}
            isUserAbsent={logic.isUserAbsent}
            getAbsenceReason={logic.getAbsenceReason}
            assignedOnClosestDate={assignedOnClosestDate}
            showPeek={true}
            getConflictStatus={getConflictStatus}
            userData={userData}
            allTeams={allTeams}
            teamName={teamId || ""}
            activePosition={activePositionId || ""}
            hasPositionCoverageRequest={hasPositionCoverageRequest}
            isToday={isToday}
            isPast={isPast}
            slot={row.slot}
            isFirstSlot={row.isFirstSlot}
            isLastSlot={row.isLastSlot}
          />
        );
      })}
    </RosterTable>
  );
};

export default GeneralRosterTable;
