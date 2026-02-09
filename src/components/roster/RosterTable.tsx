import { useCallback, useEffect, useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  fetchRosterEntries,
  saveRosterChanges,
  updateLocalAssignment,
  resetRosterEdits,
} from '../../store/slices/rosterSlice';
import {
  fetchTeamDataForRoster,
  fetchUsersByTeamAndPosition,
} from '../../store/slices/rosterViewSlice';
import Spinner from '../common/Spinner';
import './roster-table.css';

const RosterTable = () => {
  const dispatch = useAppDispatch();
  const { teamName, positionName: activePosition } = useParams();

  const { users, rosterDates, loadingUsers, loadingTeam, error: viewError } =
    useAppSelector((state) => state.rosterView);
  const { entries, dirtyEntries, saving, error: rosterError } = useAppSelector(
    (state) => state.roster,
  );
  const { teams: allTeams } = useAppSelector((state) => state.teams);
  const { positions: allPositions } = useAppSelector((state) => state.positions);

  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);

  const hasDirtyChanges = Object.keys(dirtyEntries).length > 0;

  const currentPosition = useMemo(
    () => allPositions.find((p) => p.name === activePosition),
    [allPositions, activePosition],
  );

  const sortedUsers = useMemo(() => {
    const list = [...users];
    if (currentPosition?.sortByGender) {
      return list.sort((a, b) => {
        if (a.gender === b.gender) {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (a.gender === 'Male') return -1;
        if (b.gender === 'Male') return 1;
        return (a.gender || '').localeCompare(b.gender || '');
      });
    }
    return list;
  }, [users, currentPosition]);

  useEffect(() => {
    dispatch(fetchRosterEntries());
  }, [dispatch]);

  useEffect(() => {
    if (activePosition && teamName) {
      dispatch(fetchUsersByTeamAndPosition({ teamName, positionName: activePosition }));
    }
  }, [activePosition, teamName, dispatch]);

  useEffect(() => {
    if (teamName) {
      dispatch(fetchTeamDataForRoster(teamName));
    }
  }, [teamName, dispatch]);

  const isCellDisabled = useCallback(
    (dateString: string, userEmail: string) => {
      if (!teamName || !activePosition) return false;

      const dateKey = dateString.split('T')[0];
      const entry = dirtyEntries[dateKey] || entries[dateKey];
      const currentTeam = allTeams.find((t) => t.name === teamName);
      const maxConflict = currentTeam?.maxConflict || 1;

      if (!entry || !entry.teams[teamName] || !entry.teams[teamName][userEmail]) {
        return false;
      }

      const userAssignments = entry.teams[teamName][userEmail];

      const children = allPositions.filter((p) => p.parentId === activePosition);
      const positionGroupNames = [activePosition, ...children.map((c) => c.name)];
      const isInGroup = userAssignments.some((p) => positionGroupNames.includes(p));

      if (isInGroup) return false;

      return userAssignments.length >= maxConflict;
    },
    [teamName, activePosition, dirtyEntries, entries, allTeams, allPositions],
  );

  const handleCellClick = useCallback(
    (dateString: string, userEmail: string, row: number, col: number) => {
      if (!teamName || !activePosition || isCellDisabled(dateString, userEmail)) {
        setFocusedCell({ row, col });
        return;
      }

      setFocusedCell({ row, col });

      const currentTeam = allTeams.find((t) => t.name === teamName);
      const maxConflict = currentTeam?.maxConflict || 1;

      // Build the position group: [Parent, Child1, Child2...]
      const children = allPositions.filter((p) => p.parentId === activePosition);
      const positionGroupNames = [activePosition, ...children.map((c) => c.name)];

      dispatch(
        updateLocalAssignment({
          date: dateString.split('T')[0],
          teamName,
          userIdentifier: userEmail,
          positionGroupNames,
          maxConflict,
        }),
      );
    },
    [dispatch, teamName, activePosition, isCellDisabled, allTeams, allPositions],
  );

  const handleSave = useCallback(() => {
    dispatch(saveRosterChanges(dirtyEntries));
  }, [dispatch, dirtyEntries]);

  const handleCancel = useCallback(() => {
    dispatch(resetRosterEdits());
  }, [dispatch]);

  const getCellContent = (dateString: string, userEmail: string) => {
    const dateKey = dateString.split('T')[0];
    const entry = dirtyEntries[dateKey] || entries[dateKey];
    if (!entry || !teamName || !entry.teams[teamName] || !entry.teams[teamName][userEmail]) {
      return '-';
    }

    const assignedPositions = entry.teams[teamName][userEmail];

    return (
      <div className="assigned-positions">
        {assignedPositions.map((posName) => {
          const pos = allPositions.find((p) => p.name === posName);
          return (
            <span key={posName} title={posName} className="pos-emoji">
              {pos?.emoji || '❓'}
            </span>
          );
        })}
      </div>
    );
  };

  // Keyboard navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!focusedCell) return;

      const { row, col } = focusedCell;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (row > 0) setFocusedCell({ row: row - 1, col });
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (row < rosterDates.length - 1) setFocusedCell({ row: row + 1, col });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (col > 0) setFocusedCell({ row, col: col - 1 });
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (col < sortedUsers.length - 1) setFocusedCell({ row, col: col + 1 });
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            if (row > 0) setFocusedCell({ row: row - 1, col });
          } else {
            if (row < rosterDates.length - 1) setFocusedCell({ row: row + 1, col });
          }
          break;
        case ' ': {
          e.preventDefault();
          const dStr = rosterDates[row];
          const usr = sortedUsers[col];
          if (usr?.email) {
            handleCellClick(dStr, usr.email, row, col);
          }
          break;
        }
        case 'Enter':
          if (hasDirtyChanges) {
            e.preventDefault();
            handleSave();
          }
          break;
        case 'Escape':
          if (hasDirtyChanges) {
            e.preventDefault();
            handleCancel();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    focusedCell,
    rosterDates,
    sortedUsers,
    hasDirtyChanges,
    handleCellClick,
    handleSave,
    handleCancel,
  ]);

  if (loadingUsers || loadingTeam) {
    return <Spinner />;
  }

  const error = viewError || rosterError;
  if (error) {
    return <div className="roster-table-error">Error: {error}</div>;
  }

  if (sortedUsers.length === 0) {
    return <div className="roster-table-loading">No users found for this position.</div>;
  }

  return (
    <div className="roster-table-wrapper">
      <div className="roster-table-container">
        <table className="roster-table">
          <thead>
            <tr>
              <th className="roster-table-header-cell">Date</th>
              {sortedUsers.map((user) => (
                <th key={user.email} className="roster-table-header-cell">
                  {user.name}
                  {currentPosition?.sortByGender && (
                    <span className="gender-label">
                      ({user.gender === 'Male' ? 'M' : user.gender === 'Female' ? 'F' : '?'})
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rosterDates.map((dateString, rowIndex) => (
              <tr key={dateString}>
                <td className="date-cell">{new Date(dateString).toLocaleDateString()}</td>
                {sortedUsers.map((user, colIndex) => {
                  const isFocused = focusedCell?.row === rowIndex && focusedCell?.col === colIndex;
                  const disabled = user.email ? isCellDisabled(dateString, user.email) : false;
                  return (
                    <td
                      key={user.email}
                      className={`roster-cell ${!disabled ? 'clickable' : 'disabled'} ${
                        isFocused ? 'focused' : ''
                      }`}
                      onClick={() =>
                        user.email && handleCellClick(dateString, user.email, rowIndex, colIndex)
                      }
                      tabIndex={0}
                      onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex })}
                    >
                      {user.email && getCellContent(dateString, user.email)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasDirtyChanges && (
        <div className="roster-save-footer">
          <div className="save-footer-content">
            <span className="changes-label">You have unsaved changes</span>
            <div className="save-footer-actions">
              <button className="cancel-btn" onClick={handleCancel} disabled={saving}>
                Discard
              </button>
              <button className="save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Roster'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterTable;

