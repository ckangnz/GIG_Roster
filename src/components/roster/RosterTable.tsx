import { useEffect } from "react";

import { useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import {
  fetchTeamDataForRoster,
  fetchUsersByPosition,
} from "../../store/slices/rosterViewSlice";
import "./roster-table.css";

const RosterTable = () => {
  const dispatch = useAppDispatch();
  const { teamName, positionName: activePosition } = useParams();

  const { users, rosterDates, loadingUsers, loadingTeam, error } =
    useAppSelector((state) => state.rosterView);

  useEffect(() => {
    if (activePosition) {
      dispatch(fetchUsersByPosition(activePosition));
    }
  }, [activePosition, dispatch]);

  useEffect(() => {
    if (teamName) {
      dispatch(fetchTeamDataForRoster(teamName));
    }
  }, [teamName, dispatch]);

  if (loadingUsers || loadingTeam) {
    return <div className="roster-table-loading">Loading roster data...</div>;
  }

  if (error) {
    return <div className="roster-table-error">Error: {error}</div>;
  }

  return (
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
              <td>{new Date(dateString).toLocaleDateString()}</td>
              {users.map((user) => (
                <td key={user.email}>-</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RosterTable;
