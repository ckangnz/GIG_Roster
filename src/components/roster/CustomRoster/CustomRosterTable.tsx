import { useMemo, useCallback } from "react";

import { useRosterBaseLogic } from "../../../hooks/useRosterBaseLogic";
import { updatePositionCustomLabels } from "../../../store/slices/positionsSlice";
import RosterTable from "../RosterTable";
import { CustomRosterHeader } from "./CustomRosterHeader";
import { CustomRosterRow } from "./CustomRosterRow";

const CustomRosterTable = () => {
  const logic = useRosterBaseLogic();
  const {
    dispatch,
    teamName,
    activePosition,
    allPositions,
    userData,
    rosterDates,
    entries,
    hiddenUserList,
    closestNextDate,
    handleCellClick,
  } = logic;

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

  const handleKeyboardCustomCellClick = useCallback((row: number, col: number) => {
    const dateString = rosterDates[row];
    const label = currentPosition?.customLabels?.[col];
    if (dateString && label) {
      handleCellClick(dateString, label, row, col);
    }
  }, [rosterDates, currentPosition, handleCellClick]);

  const getCellContent = useCallback(
    (dateString: string, label: string) => {
      const entry = entries[dateString];
      if (!entry || !teamName) return "";
      const assignments = entry.teams[teamName]?.[label] || [];
      return assignments.length > 0 ? currentPosition?.emoji || "✅" : "";
    },
    [entries, teamName, currentPosition],
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
      onCellClick={handleKeyboardCustomCellClick}
    >
      {rosterDates.map((dateString, rowIndex) => (
        <CustomRosterRow
          key={dateString}
          dateString={dateString}
          rowIndex={rowIndex}
          entries={entries}
          closestNextDate={closestNextDate}
          onDateClick={logic.handleDateClick}
          focusedCell={logic.focusedCell}
          setFocusedCell={logic.setFocusedCell}
          currentPosition={currentPosition}
          handleCellClick={handleCellClick}
          getCellContent={getCellContent}
          showPeek={true}
        />
      ))}
    </RosterTable>
  );
};

export default CustomRosterTable;
