import { useMemo, useCallback } from "react";

import { useRosterBaseLogic } from "../../../hooks/useRosterBaseLogic";
import { Team } from "../../../model/model";
import { updateLocalAssignment } from "../../../store/slices/rosterSlice";
import RosterTable from "../RosterTable";
import { GeneralRosterHeader } from "./GeneralRosterHeader";
import { GeneralRosterRow } from "./GeneralRosterRow";

const GeneralRosterTable = () => {
  const logic = useRosterBaseLogic();
  const {
    dispatch,
    teamName,
    activePosition,
    users,
    allPositions,
    allTeams,
    rosterDates,
    closestNextDate,
    dirtyEntries,
    entries,
    hiddenUserList,
    isSaving,
    userData,
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
    const entry = dirtyEntries[dateKey] || entries[dateKey];
    if (!entry || !entry.teams[teamName]) return [];

    const children = allPositions.filter((p) => p.parentId === activePosition);
    const positionGroupNames = [activePosition, ...children.map((c) => c.name)];

    return Object.entries(entry.teams[teamName])
      .filter(([, positions]) =>
        positions.some((p) => positionGroupNames.includes(p)),
      )
      .map(([email]) => email);
  }, [
    closestNextDate,
    teamName,
    activePosition,
    dirtyEntries,
    entries,
    allPositions,
  ]);

  const isCellDisabled = useCallback(
    (dateString: string, userEmail: string) => {
      if (!teamName || !activePosition) return false;
      if (logic.isUserAbsent(dateString, userEmail)) return true;

      const entry = dirtyEntries[dateString] || entries[dateString];
      const currentTeam = allTeams.find((t: Team) => t.name === teamName);
      const maxConflict = currentTeam?.maxConflict || 1;

      if (
        !entry ||
        !entry.teams[teamName] ||
        !entry.teams[teamName][userEmail]
      )
        return false;

      const userAssignments = entry.teams[teamName][userEmail];
      const children = allPositions.filter((p) => p.parentId === activePosition);
      const positionGroupNames = [
        activePosition,
        ...children.map((c) => c.name),
      ];

      if (userAssignments.some((p) => positionGroupNames.includes(p)))
        return false;
      return userAssignments.length >= maxConflict;
    },
    [
      teamName,
      activePosition,
      logic,
      dirtyEntries,
      entries,
      allTeams,
      allPositions,
    ],
  );

  const handleCellClick = useCallback(
    (dateString: string, userEmail: string, row: number, col: number) => {
      if (isCellDisabled(dateString, userEmail)) {
        logic.setFocusedCell({ row, col, table: "roster" });
        return;
      }
      logic.setFocusedCell({ row, col, table: "roster" });

      const currentTeam = allTeams.find((t: Team) => t.name === teamName);
      const maxConflict = currentTeam?.maxConflict || 1;
      const children = allPositions.filter((p) => p.parentId === activePosition);
      const positionGroupNames: string[] = [
        activePosition!,
        ...children.map((c) => c.name),
      ];

      dispatch(
        updateLocalAssignment({
          date: dateString,
          teamName: teamName!,
          userIdentifier: userEmail,
          positionGroupNames,
          maxConflict,
        }),
      );
    },
    [
      isCellDisabled,
      logic,
      allTeams,
      teamName,
      activePosition,
      allPositions,
      dispatch,
    ],
  );

  const handleKeyboardCellClick = useCallback((row: number, col: number) => {
    const dateString = rosterDates[row];
    const user = sortedUsers[col];
    if (dateString && user?.email) {
      handleCellClick(dateString, user.email, row, col);
    }
  }, [rosterDates, sortedUsers, handleCellClick]);

  const getCellContent = useCallback(
    (dateString: string, userEmail: string) => {
      const entry = dirtyEntries[dateString] || entries[dateString];
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
    [dirtyEntries, entries, teamName, allPositions],
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
      isSaving={isSaving}
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
          dirtyEntries={dirtyEntries}
          closestNextDate={closestNextDate}
          onDateClick={logic.handleDateClick}
          focusedCell={logic.focusedCell}
          setFocusedCell={logic.setFocusedCell}
          handleCellClick={handleCellClick}
          getCellContent={getCellContent}
          sortedUsers={sortedUsers}
          genderDividerIndex={genderDividerIndex}
          isCellDisabled={isCellDisabled}
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
