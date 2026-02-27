import { useMemo, useCallback } from "react";

import { motion } from "framer-motion";


import { useRosterBaseLogic } from "../../../hooks/useRosterBaseLogic";
import NameTag from "../../common/NameTag";
import RosterTable from "../RosterTable";
import { AllRosterHeader } from "./AllRosterHeader";
import { AllRosterRow } from "./AllRosterRow";
import { useAppDispatch, useAppSelector } from "../../../hooks/redux";
import { useRosterHeaderLogic } from "../../../hooks/useRosterHeaderLogic";
import { setHighlightedUserId } from "../../../store/slices/rosterViewSlice";

import allStyles from "./all-roster.module.css";

const AllRosterTable = () => {
  const logic = useRosterBaseLogic();
  const dispatch = useAppDispatch();
  const { hasPastDates } = useRosterHeaderLogic();
  const { filterUserId, highlightedUserId } = useAppSelector((state) => state.rosterView);
  const {
    teamName,
    allTeamUsers,
    currentTeamData,
    allPositions,
    rosterAllViewMode,
    userData,
    rosterDates,
    navigate,
    entries,
    hiddenUserList,
    closestNextDate,
    getConflictStatus,
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
    let userCols = filteredAllTeamUsers.map((u) => ({
      id: u.email || "",
      name: u.name || "",
      isUser: true,
      gender: u.gender,
    }));

    // Sort userCols to put "Me" first, then alphabetical
    userCols.sort((a, b) => {
      const isMeA = a.id === userData?.email;
      const isMeB = b.id === userData?.email;
      if (isMeA) return -1;
      if (isMeB) return 1;
      return a.name.localeCompare(b.name);
    });

    if (rosterAllViewMode === "user" && filterUserId) {
      userCols = userCols.filter((col) => col.id === filterUserId);
    }

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
  }, [
    filteredAllTeamUsers,
    currentTeamData,
    allPositions,
    filterUserId,
    rosterAllViewMode,
    userData,
  ]);

  const getAssignmentsForIdentifier = useCallback(
    (dateString: string, identifier: string) => {
      const dateKey = dateString.split("T")[0];
      const entry = entries[dateKey];
      if (!entry || !teamName || !entry.teams[teamName]) return [];

      let assignments = entry.teams[teamName][identifier] || [];
      if (!Array.isArray(assignments) || assignments.length === 0) {
        const target = identifier.trim();
        const matchingKey = Object.keys(entry.teams[teamName]).find(
          (k) => k.trim() === target,
        );
        if (matchingKey) {
          assignments = entry.teams[teamName][matchingKey];
        }
      }
      return Array.isArray(assignments) ? assignments : [];
    },
    [entries, teamName],
  );

  const getAllViewUserCellContent = useCallback(
    (dateString: string, userIdentifier: string) => {
      const userAssignments = getAssignmentsForIdentifier(
        dateString,
        userIdentifier,
      );
      if (userAssignments.length === 0) return null;

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
              <motion.span
                key={posName}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/app/roster/${teamName}/${posName}`);
                }}
                title={posName}
                style={{ cursor: "pointer", display: "inline-block" }}
              >
                {pos?.emoji || "❓"}
              </motion.span>
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
      const entry = entries[dateKey];
      if (!entry || !teamName) return null;

      const assignedEntries = Object.entries(entry.teams[teamName] || {}).filter(
        ([, positions]) =>
          Array.isArray(positions) && positions.includes(positionName),
      );

      if (assignedEntries.length === 0) return null;

      const pos = allPositions.find((p) => p.name === positionName);

      // Sort assigned entries
      const sortedAssignedEntries = [...assignedEntries].sort((a, b) => {
        const userA = filteredAllTeamUsers.find((u) => u.email === a[0]);
        const userB = filteredAllTeamUsers.find((u) => u.email === b[0]);
        const nameA = userA?.name || a[0];
        const nameB = userB?.name || b[0];

        if (pos?.sortByGender) {
          const genderA = userA?.gender || "";
          const genderB = userB?.gender || "";

          if (genderA !== genderB) {
            if (genderA === "Male") return -1;
            if (genderB === "Male") return 1;
            return genderA.localeCompare(genderB);
          }
        }

        return nameA.localeCompare(nameB);
      });

      return (
        <div style={{ fontSize: "0.75rem" }}>
          {sortedAssignedEntries.map(([id], idx) => {
            const user = filteredAllTeamUsers.find((u) => u.email === id);
            const isMe = id === userData?.email;
            const displayName = user ? user.name : id;
            const isHighlighted = id === highlightedUserId;
            return (
              <span key={id}>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(
                      setHighlightedUserId(
                        highlightedUserId === id ? null : id,
                      ),
                    );
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <NameTag
                    displayName={displayName}
                    isMe={isMe}
                    isHighlighted={isHighlighted}
                    gender={user?.gender}
                  />
                </span>
                {idx < sortedAssignedEntries.length - 1 ? ", " : ""}
              </span>
            );
          })}
        </div>
      );
    },
    [
      entries,
      teamName,
      filteredAllTeamUsers,
      userData,
      dispatch,
      highlightedUserId,
      allPositions,
    ],
  );

  const isHighlightedCell = (dateString: string, identifier: string, type: 'user' | 'position') => {
    if (!highlightedUserId || !entries) return false;
    const dateKey = dateString.split('T')[0];
    const entry = entries[dateKey];
    if (!entry || !teamName || !entry.teams[teamName]) return false;

    if (type === 'user') {
      return identifier === highlightedUserId;
    } else {
      // position
      const assignments = entry.teams[teamName][highlightedUserId] || [];
      return assignments.includes(identifier);
    }
  };

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
      hiddenUserList={hiddenUserList}
      renderHeader={renderHeader}
      onLoadNextYear={logic.handleLoadNextYear}
      colCount={
        rosterAllViewMode === "user"
          ? allViewColumns.length
          : currentTeamData?.positions.length || 0
      }
      onCellClick={handleKeyboardAllCellClick}
      hasPastDates={hasPastDates}
      className={filterUserId ? allStyles.filteredTableContainer : ""}
    >
      {rosterDates.map((dateString, rowIndex) => (
          <AllRosterRow
            key={dateString}
            dateString={dateString}
            rowIndex={rowIndex}
            entries={entries}
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
            isHighlightedCell={isHighlightedCell}
            getConflictStatus={getConflictStatus}
          />
        ))}
      </RosterTable>
  );
};

export default AllRosterTable;
