import { useMemo, useCallback } from "react";

import { motion } from "framer-motion";

import { CustomRosterHeader } from "./CustomRosterHeader";
import { CustomRosterRow } from "./CustomRosterRow";
import { useRosterBaseLogic } from "../../../hooks/useRosterBaseLogic";
import { useRosterHeaderLogic } from "../../../hooks/useRosterHeaderLogic";
import { useRosterVisualRows } from "../../../hooks/useRosterVisualRows";
import { isTeamRosterData } from "../../../model/model";
import { updatePositionCustomLabels } from "../../../store/slices/positionsSlice";
import RosterTable from "../RosterTable";

const CustomRosterTable = () => {
  const logic = useRosterBaseLogic();
  const { hasPastDates } = useRosterHeaderLogic();
  const {
    dispatch,
    teamId,
    activePosition,
    allPositions,
    userData,
    rosterDates,
    entries,
    hiddenUserList,
    closestNextDate,
    handleCellClick,
    allTeams,
  } = logic;

  const currentTeam = useMemo(() => allTeams.find(t => t.id === teamId), [allTeams, teamId]);
  const isSlotted = currentTeam?.rosterMode === "slotted";

  const visualRows = useRosterVisualRows(rosterDates, currentTeam || null, !!isSlotted);

  const currentPosition = useMemo(
    () => allPositions.find((p) => p.name === activePosition),
    [allPositions, activePosition],
  );

  const handleUpdateCustomLabel = useCallback(
    (index: number, value: string) => {
      if (!currentPosition || !activePosition) return;
      const currentLabels = [...(currentPosition.customLabels || [])];
      currentLabels[index] = value;
      dispatch(
        updatePositionCustomLabels({
          positionName: activePosition,
          labels: currentLabels,
        }),
      );
    },
    [dispatch, currentPosition, activePosition],
  );

  const handleMoveCustomLabel = useCallback(
    (index: number, direction: "left" | "right") => {
      if (!currentPosition || !activePosition) return;
      const currentLabels = [...(currentPosition.customLabels || [])];
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= currentLabels.length) return;
      const temp = currentLabels[index];
      currentLabels[index] = currentLabels[targetIndex];
      currentLabels[targetIndex] = temp;
      dispatch(
        updatePositionCustomLabels({
          positionName: activePosition,
          labels: currentLabels,
        }),
      );
    },
    [dispatch, currentPosition, activePosition],
  );

  const handleRemoveCustomLabel = useCallback(
    (index: number) => {
      if (!currentPosition || !activePosition) return;
      const currentLabels = [...(currentPosition.customLabels || [])];
      currentLabels.splice(index, 1);
      dispatch(
        updatePositionCustomLabels({
          positionName: activePosition,
          labels: currentLabels,
        }),
      );
    },
    [dispatch, currentPosition, activePosition],
  );

  const handleAddCustomLabel = useCallback(() => {
    if (!currentPosition || !activePosition) return;
    const currentLabels = currentPosition.customLabels || [];
    dispatch(
      updatePositionCustomLabels({
        positionName: activePosition,
        labels: [...currentLabels, ""],
      }),
    );
  }, [dispatch, currentPosition, activePosition]);

  const handleKeyboardCustomCellClick = useCallback((rowIdx: number, col: number) => {
    const row = visualRows[rowIdx];
    const label = currentPosition?.customLabels?.[col];
    if (row && label) {
      handleCellClick(row.dateString, label, rowIdx, col, row.slot?.id);
    }
  }, [visualRows, currentPosition, handleCellClick]);

  const getCellContent = useCallback(
    (dateString: string, label: string, slotId?: string) => {
      const entry = entries[dateString];
      if (!entry || !teamId) return "";

      const teamData = entry.teams[teamId];
      let assignments: string[] = [];

      if (teamData) {
        if (isTeamRosterData(teamData) && teamData.type === 'slotted' && slotId) {
          assignments = teamData.slots?.[slotId]?.[label] || [];
        } else if (!isTeamRosterData(teamData)) {
          assignments = teamData[label] || [];
        }
      }
      
      if (assignments.length === 0) return "";

      return (
        <motion.span
          key="assigned"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          style={{ display: "inline-block" }}
        >
          {currentPosition?.emoji || "✅"}
        </motion.span>
      );
    },
    [entries, teamId, currentPosition],
  );

  const renderHeader = () => (
    <CustomRosterHeader
      currentPosition={currentPosition}
      userData={userData}
      handleUpdateCustomLabel={handleUpdateCustomLabel}
      handleMoveCustomLabel={handleMoveCustomLabel}
      handleRemoveCustomLabel={handleRemoveCustomLabel}
      handleAddCustomLabel={handleAddCustomLabel}
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
      colCount={currentPosition?.customLabels?.length || 0}
      rowCount={visualRows.length}
      onCellClick={handleKeyboardCustomCellClick}
      hasPastDates={hasPastDates}
    >
      {visualRows.map((row, rowIndex) => {
        const rowClass = logic.getRowClass(row.dateString);
        const isPast = rowClass === "past-date";
        const isToday = rowClass === "today-date";

        return (
          <CustomRosterRow
            key={row.slot ? `${row.dateString}-${row.slot.id}` : row.dateString}
            dateString={row.dateString}
            rowIndex={rowIndex}
            entries={entries}
            closestNextDate={closestNextDate}
            onDateClick={logic.handleDateClick}
            focusedCell={logic.focusedCell}
            setFocusedCell={logic.setFocusedCell}
            currentPosition={currentPosition}
            handleCellClick={(date, email, r, c) => handleCellClick(date, email, r, c, row.slot?.id)}
            getCellContent={(date, email) => getCellContent(date, email, row.slot?.id)}
            showPeek={true}
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

export default CustomRosterTable;
