import { useMemo, useCallback } from "react";

import { useRosterBaseLogic } from "../../../hooks/useRosterBaseLogic";
import RosterTable from "../RosterTable";
import { AbsenceRosterHeader } from "./AbsenceRosterHeader";
import { AbsenceRosterRow } from "./AbsenceRosterRow";
import { useRosterHeaderLogic } from "../../../hooks/useRosterHeaderLogic";

const AbsenceRosterTable = () => {
  const logic = useRosterBaseLogic();
  const { hasPastDates } = useRosterHeaderLogic();
  const {
    allTeamUsers,
    rosterDates,
    entries,
    hiddenUserList,
    closestNextDate,
    handleAbsenceClick,
    handleAbsenceReasonChange,
    userData,
  } = logic;

  const sortedAllTeamUsers = useMemo(() => {
    return [...allTeamUsers].sort((a, b) => {
      const isMeA = a.email === userData?.email;
      const isMeB = b.email === userData?.email;
      if (isMeA) return -1;
      if (isMeB) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [allTeamUsers, userData]);

  const handleKeyboardAbsenceClick = useCallback((row: number, col: number) => {
    const dateString = rosterDates[row];
    const user = sortedAllTeamUsers[col];
    if (dateString && user?.email) {
      handleAbsenceClick(dateString, user.email, row, col);
    }
  }, [rosterDates, sortedAllTeamUsers, handleAbsenceClick]);

  const renderHeader = () => (
    <AbsenceRosterHeader 
      allTeamUsers={sortedAllTeamUsers} 
      userData={userData}
      showPeek={true} 
    />
  );

  return (
    <RosterTable
      {...logic}
      isAllView={false}
      isAbsenceView={true}
      hiddenUserList={hiddenUserList}
      renderHeader={renderHeader}
      onLoadNextYear={logic.handleLoadNextYear}
      colCount={sortedAllTeamUsers.length}
      onCellClick={handleKeyboardAbsenceClick}
      hasPastDates={hasPastDates}
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
          allTeamUsers={sortedAllTeamUsers}
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
