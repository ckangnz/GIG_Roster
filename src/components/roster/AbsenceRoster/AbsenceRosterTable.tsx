import { useCallback } from "react";

import { useRosterBaseLogic } from "../../../hooks/useRosterBaseLogic";
import { updateLocalAbsence } from "../../../store/slices/rosterSlice";
import { showAlert } from "../../../store/slices/uiSlice";
import RosterTable from "../RosterTable";
import { AbsenceRosterHeader } from "./AbsenceRosterHeader";
import { AbsenceRosterRow } from "./AbsenceRosterRow";

const AbsenceRosterTable = () => {
  const logic = useRosterBaseLogic();
  const {
    dispatch,
    allTeamUsers,
    rosterDates,
    dirtyEntries,
    entries,
    isSaving,
    hiddenUserList,
    closestNextDate,
  } = logic;

  const handleAbsenceClick = useCallback(
    (dateString: string, userEmail: string, row: number, col: number) => {
      logic.setFocusedCell({ row, col, table: "absence" });
      const isCurrentlyAbsent = logic.isUserAbsent(dateString, userEmail);

      if (!isCurrentlyAbsent) {
        const dateKey = dateString;
        const entry = dirtyEntries[dateKey] || entries[dateKey];
        const affectedAssignments: string[] = [];

        if (entry) {
          Object.entries(entry.teams).forEach(([tName, teamAssignments]) => {
            if (
              teamAssignments[userEmail] &&
              teamAssignments[userEmail].length > 0
            ) {
              affectedAssignments.push(
                `${tName}: ${teamAssignments[userEmail].join(", ")}`,
              );
            }
          });
        }

        if (affectedAssignments.length > 0) {
          dispatch(
            showAlert({
              title: "Clear Existing Assignments?",
              message: `User is already assigned to:\n\n${affectedAssignments.join(
                "\n",
              )}\n\nMarking them as absent will remove these assignments. Continue?`,
              confirmText: "Mark Absent",
              onConfirm: () => {
                dispatch(
                  updateLocalAbsence({
                    date: dateString,
                    userIdentifier: userEmail,
                    isAbsent: true,
                  }),
                );
              },
            }),
          );
          return;
        }
      }

      dispatch(
        updateLocalAbsence({
          date: dateString,
          userIdentifier: userEmail,
          isAbsent: !isCurrentlyAbsent,
        }),
      );
    },
    [dispatch, logic, dirtyEntries, entries],
  );

  const handleKeyboardAbsenceClick = useCallback((row: number, col: number) => {
    const dateString = rosterDates[row];
    const user = allTeamUsers[col];
    if (dateString && user?.email) {
      handleAbsenceClick(dateString, user.email, row, col);
    }
  }, [rosterDates, allTeamUsers, handleAbsenceClick]);

  const handleAbsenceReasonChange = useCallback(
    (dateString: string, userEmail: string, reason: string) => {
      dispatch(
        updateLocalAbsence({
          date: dateString,
          userIdentifier: userEmail,
          reason,
          isAbsent: true,
        }),
      );
    },
    [dispatch],
  );

  const renderHeader = () => (
    <AbsenceRosterHeader allTeamUsers={allTeamUsers} showPeek={true} />
  );

  return (
    <RosterTable
      {...logic}
      isAllView={false}
      isAbsenceView={true}
      isSaving={isSaving}
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
          dirtyEntries={dirtyEntries}
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
