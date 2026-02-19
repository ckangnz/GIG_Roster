import { useMemo, useCallback } from "react";

import { useRosterBaseLogic } from "../../../hooks/useRosterBaseLogic";
import RosterTable from "../RosterTable";
import { GeneralRosterHeader } from "./GeneralRosterHeader";
import { GeneralRosterRow } from "./GeneralRosterRow";

const GeneralRosterTable = () => {
  const logic = useRosterBaseLogic();
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
    handleCellClick,
  } = logic;

  const currentPosition = useMemo(
    () => allPositions.find((p) => p.name === activePosition),
    [allPositions, activePosition],
  );

  const sortedUsers = useMemo(() => {
    const list = users.filter(
      (u) => u.email && !hiddenUserList.includes(u.email) && u.isActive,
    );
    if (currentPosition?.sortByGender) {
      return list.sort((a, b) => {
        if (a.gender === b.gender)
          return (a.name || "").localeCompare(b.name || "");
        if (a.gender === "Male") return -1;
        if (b.gender === "Male") return 1;
        return (a.gender || "").localeCompare(b.gender || "");
      });
    }
    return list;
  }, [users, currentPosition, hiddenUserList]);

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
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "4px",
            flexWrap: "wrap",
          }}
        >
          {currentTeamAssignments.map((posName) => {
            const pos = allPositions.find((p) => p.name === posName);
            return (
              <span key={posName} title={`${teamName}: ${posName}`}>
                {pos?.emoji || "❓"}
              </span>
            );
          })}
          {otherTeamsAssignments.map((ota) =>
            ota.positions.map((posName) => {
              const pos = allPositions.find((p) => p.name === posName);
              return (
                <span
                  key={`${ota.team}-${posName}`}
                  title={`${ota.team}: ${posName}`}
                  style={{ opacity: 0.6 }}
                >
                  {pos?.emoji || "❓"}
                </span>
              );
            }),
          )}
        </div>
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
        />
      ))}
    </RosterTable>
  );
};

export default GeneralRosterTable;
