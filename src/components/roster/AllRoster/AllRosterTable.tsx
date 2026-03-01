import { useMemo, useCallback } from "react";

import { motion } from "framer-motion";

import { AllRosterHeader } from "./AllRosterHeader";
import { AllRosterRow } from "./AllRosterRow";
import { useAppDispatch, useAppSelector } from "../../../hooks/redux";
import { useRosterBaseLogic } from "../../../hooks/useRosterBaseLogic";
import { useRosterHeaderLogic } from "../../../hooks/useRosterHeaderLogic";
import { useRosterVisualRows } from "../../../hooks/useRosterVisualRows";
import { getAssignmentsForTeam } from "../../../model/model";
import { setHighlightedUserId } from "../../../store/slices/rosterViewSlice";
import NameTag from "../../common/NameTag";
import RosterTable from "../RosterTable";

import allStyles from "./all-roster.module.css";

const AllRosterTable = () => {
  const logic = useRosterBaseLogic();
  const dispatch = useAppDispatch();
  const { hasPastDates } = useRosterHeaderLogic();
  const { filterUserId, highlightedUserId } = useAppSelector((state) => state.rosterView);
  const {
    teamId,
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

  const currentTeam = useMemo(() => currentTeamData, [currentTeamData]);
  const isSlotted = currentTeam?.rosterMode === "slotted";

  const visualRows = useRosterVisualRows(rosterDates, currentTeam || null, !!isSlotted);

  // Positions to display in Position View (including children)
  const allViewPositions = useMemo(() => {
    if (rosterAllViewMode !== "position" || !currentTeamData) return [];
    
    const teamPositionIds = currentTeamData.positions || [];
    const activePosIdSet = new Set<string>(teamPositionIds);

    // Also ensure children of these positions are included
    teamPositionIds.forEach(pId => {
      allPositions.forEach(p => {
        if (p.parentId === pId) activePosIdSet.add(p.id);
      });
    });

    return Array.from(activePosIdSet).sort((aId, bId) => {
      const posA = allPositions.find(p => p.id === aId || p.name === aId);
      const posB = allPositions.find(p => p.id === bId || p.name === bId);
      
      const effectiveParentA = posA?.parentId || aId;
      const effectiveParentB = posB?.parentId || bId;

      if (effectiveParentA === effectiveParentB) {
        if (!posA?.parentId) return -1;
        if (!posB?.parentId) return 1;
        return (posA.name || "").localeCompare(posB.name || "");
      }

      const indexA = teamPositionIds.indexOf(effectiveParentA);
      const indexB = teamPositionIds.indexOf(effectiveParentB);
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return (posA?.name || "").localeCompare(posB?.name || "");
    });
  }, [rosterAllViewMode, currentTeamData, allPositions]);

  // Re-implementing view-specific logic
  const filteredAllTeamUsers = useMemo(() => {
    return allTeamUsers.filter((u) => {
      if (!u.isActive || !teamId) return false;
      const userTeamPositions = u.teamPositions?.[teamId] || [];
      return userTeamPositions.length > 0;
    });
  }, [allTeamUsers, teamId]);

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

    const teamPositionIds = currentTeamData.positions || [];

    const customLabels = Array.from(
      new Set(
        allPositions
          .filter((p) => (teamPositionIds.includes(p.id) || teamPositionIds.includes(p.name)) && p.isCustom)
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
      if (!entry || !teamId || !entry.teams[teamId]) return [];

      const teamAssignments = getAssignmentsForTeam(entry, teamId);
      let assignments = teamAssignments[identifier] || [];
      if (assignments.length === 0) {
        const target = identifier.trim();
        const matchingKey = Object.keys(teamAssignments).find(
          (k) => k.trim() === target,
        );
        if (matchingKey) {
          assignments = teamAssignments[matchingKey];
        }
      }
      return assignments;
    },
    [entries, teamId],
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
          {userAssignments.map((posId) => {
            const pos = allPositions.find((p) => p.id === posId || p.name === posId);
            return (
              <motion.span
                key={posId}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/app/roster/${teamId}/${pos?.id || posId}`);
                }}
                title={pos?.name || posId}
                style={{ cursor: "pointer", display: "inline-block" }}
              >
                {pos?.emoji || "❓"}
              </motion.span>
            );
          })}
        </div>
      );
    },
    [getAssignmentsForIdentifier, allPositions, navigate, teamId],
  );

  const getAllViewPositionCellContent = useCallback(
    (dateString: string, positionIdentifier: string) => {
      const dateKey = dateString.split("T")[0];
      const entry = entries[dateKey];
      if (!entry || !teamId) return null;

      const teamAssignments = getAssignmentsForTeam(entry, teamId);
      const assignedEntries = Object.entries(teamAssignments).filter(
        ([, positions]) =>
          Array.isArray(positions) && positions.includes(positionIdentifier),
      );

      if (assignedEntries.length === 0) return null;

      const pos = allPositions.find((p) => p.id === positionIdentifier || p.name === positionIdentifier);

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
      teamId,
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
    if (!entry || !teamId) return false;

    if (type === 'user') {
      return identifier === highlightedUserId;
    } else {
      // position
      const teamAssignments = getAssignmentsForTeam(entry, teamId);
      const assignments = teamAssignments[highlightedUserId] || [];
      return assignments.includes(identifier);
    }
  };

  const handleKeyboardAllCellClick = useCallback((rowIdx: number, col: number) => {
    if (rosterAllViewMode !== "user") return;
    const row = visualRows[rowIdx];
    const column = allViewColumns[col];
    if (row && column?.isUser && column.id) {
      const assignments = getAssignmentsForIdentifier(row.dateString, column.id);
      if (assignments.length > 0) {
        const firstPosId = assignments[0];
        const pos = allPositions.find(p => p.id === firstPosId || p.name === firstPosId);
        navigate(`/app/roster/${teamId}/${pos?.id || firstPosId}`);
      }
    }
  }, [rosterAllViewMode, visualRows, allViewColumns, getAssignmentsForIdentifier, navigate, teamId, allPositions]);

  const renderHeader = () => (
    <AllRosterHeader
      rosterAllViewMode={rosterAllViewMode}
      allViewColumns={allViewColumns}
      userData={userData}
      currentTeamData={currentTeamData}
      allPositions={allPositions}
      teamName={teamId || ""}
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
          : allViewPositions.length
      }
      rowCount={visualRows.length}
      onCellClick={handleKeyboardAllCellClick}
      hasPastDates={hasPastDates}
      className={filterUserId ? allStyles.filteredTableContainer : ""}
    >
      {visualRows.map((row, rowIndex) => {
          const rowClass = logic.getRowClass(row.dateString);
          const isPast = rowClass === "past-date";
          const isToday = rowClass === "today-date";

          return (
            <AllRosterRow
              key={row.slot ? `${row.dateString}-${row.slot.id}` : row.dateString}
              dateString={row.dateString}
              rowIndex={rowIndex}
              entries={entries}
              closestNextDate={closestNextDate}
              onDateClick={logic.handleDateClick}
              focusedCell={logic.focusedCell}
              setFocusedCell={logic.setFocusedCell}
              rosterAllViewMode={rosterAllViewMode}
              allViewColumns={allViewColumns}
              currentTeamData={currentTeamData}
              allPositions={allPositions}
              allViewPositions={allViewPositions}
              getAllViewUserCellContent={getAllViewUserCellContent}
              getAllViewPositionCellContent={getAllViewPositionCellContent}
              getAssignmentsForIdentifier={getAssignmentsForIdentifier}
              navigate={navigate}
              teamName={teamId || ""}
              isUserAbsent={logic.isUserAbsent}
              getAbsenceReason={logic.getAbsenceReason}
              isHighlightedCell={isHighlightedCell}
              getConflictStatus={getConflictStatus}
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

export default AllRosterTable;
