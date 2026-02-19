import { useCallback } from "react";

import { useRosterBaseLogic } from "../../../hooks/useRosterBaseLogic";
import RosterTable from "../RosterTable";
import { AbsenceRosterHeader } from "./AbsenceRosterHeader";
import { AbsenceRosterRow } from "./AbsenceRosterRow";

const AbsenceRosterTable = () => {
  const logic = useRosterBaseLogic();
  const {
    allTeamUsers,
    rosterDates,
    entries,
    hiddenUserList,
    closestNextDate,
    handleAbsenceClick,
    handleAbsenceReasonChange,
  } = logic;

  const handleKeyboardAbsenceClick = useCallback((row: number, col: number) => {
    const dateString = rosterDates[row];
    const user = allTeamUsers[col];
    if (dateString && user?.email) {
      handleAbsenceClick(dateString, user.email, row, col);
    }
  }, [rosterDates, allTeamUsers, handleAbsenceClick]);

  const renderHeader = () => (
    <AbsenceRosterHeader allTeamUsers={allTeamUsers} showPeek={true} />
  );

  return (
    <RosterTable
      {...logic}
      isAllView={false}
      isAbsenceView={true}
      hiddenUserList={hiddenUserList}
      renderHeader={renderHeader}
      onLoadNextYear={logic.handleLoadNextYear}
      colCount={allTeamUsers.length}
      onCellClick={handleKeyboardAbsenceClick}
    >
      {rosterDates.map((dateString, rowIndex) => (
        <AbsenceRosterRow
          key={dateString}
          dateString={dateString}
          rowIndex={rowIndex}
          entries={entries}
          closestNextDate={closestNextDate}
          onDateClick={logic.handleDateClick}
          focusedCell={logic.focusedCell}
          setFocusedCell={logic.setFocusedCell}
          allTeamUsers={allTeamUsers}
          handleAbsenceClick={handleAbsenceClick}
          handleAbsenceReasonChange={handleAbsenceReasonChange}
          isUserAbsent={logic.isUserAbsent}
          getAbsenceReason={logic.getAbsenceReason}
          showPeek={true}
        />
      ))}
    </RosterTable>
  );
};

export default AbsenceRosterTable;
