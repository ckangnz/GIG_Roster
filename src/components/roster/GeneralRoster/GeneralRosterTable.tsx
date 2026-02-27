import { useMemo, useCallback } from "react";

import { motion } from "framer-motion";


import { useRosterBaseLogic } from "../../../hooks/useRosterBaseLogic";
import RosterTable from "../RosterTable";
import { GeneralRosterHeader } from "./GeneralRosterHeader";
import { GeneralRosterRow } from "./GeneralRosterRow";
import { useRosterHeaderLogic } from "../../../hooks/useRosterHeaderLogic";
import cellStyles from "../roster-cell.module.css";

const GeneralRosterTable = () => {
  const logic = useRosterBaseLogic();
  const { hasPastDates } = useRosterHeaderLogic();
  const {
    teamName,
    activePosition,
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

  const currentPosition = useMemo(
    () => allPositions.find((p) => p.name === activePosition),
    [allPositions, activePosition],
  );

  const sortedUsers = useMemo(() => {
    const list = users.filter(
      (u) => u.email && !hiddenUserList.includes(u.email) && u.isActive,
    );

    // Sort function that puts current user first
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
    const firstFemaleIndex = sortedUsers.findIndex((u) => u.gender === "Female");
    return firstFemaleIndex > 0 && firstFemaleIndex < sortedUsers.length
      ? firstFemaleIndex
      : -1;
  }, [currentPosition, sortedUsers]);

  const assignedOnClosestDate = useMemo(() => {
    if (!closestNextDate || !teamName || !activePosition) return [];
    const dateKey = closestNextDate.split("T")[0];
    const entry = entries[dateKey];
    if (!entry || !entry.teams[teamName]) return [];

    const children = allPositions.filter((p) => p.parentId === activePosition);
    const positionGroupNames = [activePosition, ...children.map((c) => c.name)];

    return Object.entries(entry.teams[teamName])
      .filter(([, positions]) =>
        (positions as string[]).some((p) => positionGroupNames.includes(p)),
      )
      .map(([email]) => email);
  }, [
    closestNextDate,
    teamName,
    activePosition,
    entries,
    allPositions,
  ]);

  const handleKeyboardCellClick = useCallback((row: number, col: number) => {
    const dateString = rosterDates[row];
    const user = sortedUsers[col];
    if (dateString && user?.email) {
      handleCellClick(dateString, user.email, row, col);
    }
  }, [rosterDates, sortedUsers, handleCellClick]);

  const getCellContent = useCallback(
    (dateString: string, userEmail: string) => {
      const entry = entries[dateString];
      if (!entry || !teamName) return "";

      const currentTeamAssignments = entry.teams[teamName]?.[userEmail] || [];
      const otherTeamsAssignments: { team: string; positions: string[] }[] = [];
      Object.entries(entry.teams).forEach(([tName, teamData]) => {
        if (tName !== teamName && teamData[userEmail]) {
          otherTeamsAssignments.push({
            team: tName,
            positions: teamData[userEmail],
          });
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
            {currentTeamAssignments.map((posName) => {
              const pos = allPositions.find((p) => p.name === posName);
              return (
                <motion.span
                  key={posName}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  title={`${teamName}: ${posName}`}
                  className={cellStyles.currentTeamEmoji}
                >
                  {pos?.emoji || "❓"}
                </motion.span>
              );
            })}
          </div>
          {otherTeamsAssignments.length > 0 && (
            <div className={cellStyles.otherTeamsIndicator}>
              {otherTeamsAssignments.map((ota) =>
                ota.positions.map((posName) => {
                  const pos = allPositions.find((p) => p.name === posName);
                  return (
                    <span
                      key={`${ota.team}-${posName}`}
                      title={`${ota.team}: ${posName}`}
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
    [entries, teamName, allPositions],
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
      colCount={sortedUsers.length}
      onCellClick={handleKeyboardCellClick}
      hasPastDates={hasPastDates}
    >
      {rosterDates.map((dateString, rowIndex) => (
        <GeneralRosterRow
          key={dateString}
          dateString={dateString}
          rowIndex={rowIndex}
          entries={entries}
          closestNextDate={closestNextDate}
          onDateClick={logic.handleDateClick}
          focusedCell={logic.focusedCell}
          setFocusedCell={logic.setFocusedCell}
          handleCellClick={handleCellClick}
          getCellContent={getCellContent}
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
          teamName={teamName || ""}
          activePosition={activePosition || ""}
          hasPositionCoverageRequest={hasPositionCoverageRequest}
        />
      ))}
    </RosterTable>
  );
};

export default GeneralRosterTable;
