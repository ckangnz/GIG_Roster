import { useEffect } from 'react';

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

  const hasDirtyChanges = Object.keys(dirtyEntries).length > 0;

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

  const handleCellClick = (dateString: string, userEmail: string) => {
    if (!teamName || !activePosition || isCellDisabled(dateString, userEmail)) return;

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
  };

  const isCellDisabled = (dateString: string, userEmail: string) => {
    if (!teamName || !activePosition) return false;

    const dateKey = dateString.split('T')[0];
    const entry = dirtyEntries[dateKey] || entries[dateKey];
    const currentTeam = allTeams.find((t) => t.name === teamName);
    const maxConflict = currentTeam?.maxConflict || 1;

    if (!entry || !entry.teams[teamName] || !entry.teams[teamName][userEmail]) {
      // If user has NO assignments at all, they can't be disabled (unless maxConflict < 1 which isn't possible)
      return false;
    }

    const userAssignments = entry.teams[teamName][userEmail];
    
    // Find if user is already in this position group
    const children = allPositions.filter((p) => p.parentId === activePosition);
    const positionGroupNames = [activePosition, ...children.map((c) => c.name)];
    const isInGroup = userAssignments.some(p => positionGroupNames.includes(p));

    // If they ARE in the group, they can always click to cycle or remove
    if (isInGroup) return false;

    // If they ARE NOT in the group, they are disabled if they've reached maxConflict
    return userAssignments.length >= maxConflict;
  };

  const handleSave = () => {
    dispatch(saveRosterChanges(dirtyEntries));
  };

  const handleCancel = () => {
    dispatch(resetRosterEdits());
  };

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

  if (loadingUsers || loadingTeam) {
    return <Spinner />;
  }

  const error = viewError || rosterError;
  if (error) {
    return <div className="roster-table-error">Error: {error}</div>;
  }

  if (users.length === 0) {
    return <div className="roster-table-loading">No users found for this position.</div>;
  }

  return (
    <div className="roster-table-wrapper">
      <div className="roster-table-container">
        <table className="roster-table">
          <thead>
            <tr>
              <th className="roster-table-header-cell">Date</th>
              {users.map((user) => (
                <th key={user.email} className="roster-table-header-cell">
                  {user.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rosterDates.map((dateString) => (
              <tr key={dateString}>
                <td className="date-cell">{new Date(dateString).toLocaleDateString()}</td>
                {users.map((user) => {
                  const disabled = user.email ? isCellDisabled(dateString, user.email) : false;
                  return (
                    <td
                      key={user.email}
                      className={`roster-cell ${!disabled ? 'clickable' : 'disabled'}`}
                      onClick={() =>
                        user.email && !disabled && handleCellClick(dateString, user.email)
                      }
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

