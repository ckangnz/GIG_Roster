import { useMemo, useCallback } from "react";

import { useRosterBaseLogic } from "../../../hooks/useRosterBaseLogic";
import NameTag from "../../common/NameTag";
import RosterTable from "../RosterTable";
import { AllRosterHeader } from "./AllRosterHeader";
import { AllRosterRow } from "./AllRosterRow";

const AllRosterTable = () => {
  const logic = useRosterBaseLogic();
  const {
    teamName,
    allTeamUsers,
    currentTeamData,
    allPositions,
    rosterAllViewMode,
    userData,
    rosterDates,
    navigate,
    dirtyEntries,
    entries,
    isSaving,
    hiddenUserList,
    closestNextDate,
  } = logic;

  // Re-implementing view-specific logic
  const filteredAllTeamUsers = useMemo(() => {
    return allTeamUsers.filter((u) => {
      if (!u.isActive || !teamName) return false;
      const userTeamPositions = u.teamPositions?.[teamName] || [];
      return userTeamPositions.length > 0;
    });
  }, [allTeamUsers, teamName]);

  const allViewColumns = useMemo(() => {
    const userCols = filteredAllTeamUsers.map((u) => ({
      id: u.email || "",
      name: u.name || "",
      isUser: true,
      gender: u.gender,
    }));

    if (!currentTeamData) return userCols;

    const teamPositionNames = currentTeamData.positions.map((p) => p.name);

    const customLabels = Array.from(
      new Set(
        allPositions
          .filter((p) => teamPositionNames.includes(p.name) && p.isCustom)
          .flatMap((p) => p.customLabels || [])
          .map((l) => l.trim())
          .filter((l) => l !== ""),
      ),
    ).map((l) => ({ id: l, name: l, isUser: false }));

    return [...userCols, ...customLabels];
  }, [filteredAllTeamUsers, currentTeamData, allPositions]);

  const getAssignmentsForIdentifier = useCallback(
    (dateString: string, identifier: string) => {
      const dateKey = dateString.split("T")[0];
      const entry = dirtyEntries[dateKey] || entries[dateKey];
      if (!entry || !teamName || !entry.teams[teamName]) return [];

      let assignments = entry.teams[teamName][identifier] || [];
      if (assignments.length === 0) {
        const target = identifier.trim();
        const matchingKey = Object.keys(entry.teams[teamName]).find(
          (k) => k.trim() === target,
        );
        if (matchingKey) {
          assignments = entry.teams[teamName][matchingKey];
        }
      }
      return assignments;
    },
    [dirtyEntries, entries, teamName],
  );

  const getAllViewUserCellContent = useCallback(
    (dateString: string, userIdentifier: string) => {
      const userAssignments = getAssignmentsForIdentifier(
        dateString,
        userIdentifier,
      );
      if (userAssignments.length === 0) return "";

      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "4px",
            flexWrap: "wrap",
          }}
        >
          {userAssignments.map((posName) => {
            const pos = allPositions.find((p) => p.name === posName);
            return (
              <span
                key={posName}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/app/roster/${teamName}/${posName}`);
                }}
                title={posName}
                style={{ cursor: "pointer" }}
              >
                {pos?.emoji || "❓"}
              </span>
            );
          })}
        </div>
      );
    },
    [getAssignmentsForIdentifier, allPositions, navigate, teamName],
  );

  const getAllViewPositionCellContent = useCallback(
    (dateString: string, positionName: string) => {
      const dateKey = dateString.split("T")[0];
      const entry = dirtyEntries[dateKey] || entries[dateKey];
      if (!entry || !teamName) return "";

      const assignedEntries = Object.entries(entry.teams[teamName] || {}).filter(
        ([, positions]) => positions.includes(positionName),
      );

      return (
        <div style={{ fontSize: "0.75rem" }}>
          {assignedEntries.map(([id], idx) => {
            const user = filteredAllTeamUsers.find((u) => u.email === id);
            const isMe = id === userData?.email;
            const displayName = user ? user.name : id;
            return (
              <span key={id}>
                <NameTag displayName={displayName} isMe={isMe} />
                {idx < assignedEntries.length - 1 ? ", " : ""}
              </span>
            );
          })}
        </div>
      );
    },
    [dirtyEntries, entries, teamName, filteredAllTeamUsers, userData],
  );

  const handleKeyboardAllCellClick = useCallback((row: number, col: number) => {
    if (rosterAllViewMode !== "user") return;
    const dateString = rosterDates[row];
    const column = allViewColumns[col];
    if (dateString && column?.isUser && column.id) {
      const assignments = getAssignmentsForIdentifier(dateString, column.id);
      if (assignments.length > 0) {
        navigate(`/app/roster/${teamName}/${assignments[0]}`);
      }
    }
  }, [rosterAllViewMode, rosterDates, allViewColumns, getAssignmentsForIdentifier, navigate, teamName]);

  const renderHeader = () => (
    <AllRosterHeader
      rosterAllViewMode={rosterAllViewMode}
      allViewColumns={allViewColumns}
      userData={userData}
      currentTeamData={currentTeamData}
      teamName={teamName}
      navigate={navigate}
    />
  );

  return (
    <RosterTable
      {...logic}
      isAllView={true}
      isAbsenceView={false}
      isSaving={isSaving}
      hiddenUserList={hiddenUserList}
      renderHeader={renderHeader}
      onLoadNextYear={logic.handleLoadNextYear}
      colCount={rosterAllViewMode === "user" ? allViewColumns.length : (currentTeamData?.positions.length || 0)}
      onCellClick={handleKeyboardAllCellClick}
    >
      {rosterDates.map((dateString, rowIndex) => (
        <AllRosterRow
          key={dateString}
          dateString={dateString}
          rowIndex={rowIndex}
          entries={entries}
          dirtyEntries={dirtyEntries}
          closestNextDate={closestNextDate}
          onDateClick={logic.handleDateClick}
          focusedCell={logic.focusedCell}
          setFocusedCell={logic.setFocusedCell}
          rosterAllViewMode={rosterAllViewMode}
          allViewColumns={allViewColumns}
          currentTeamData={currentTeamData}
          getAllViewUserCellContent={getAllViewUserCellContent}
          getAllViewPositionCellContent={getAllViewPositionCellContent}
          getAssignmentsForIdentifier={getAssignmentsForIdentifier}
          navigate={navigate}
          teamName={teamName}
          isUserAbsent={logic.isUserAbsent}
          getAbsenceReason={logic.getAbsenceReason}
        />
      ))}
    </RosterTable>
  );
};

export default AllRosterTable;
