import { useEffect } from "react";

import { useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import {
  fetchTeamDataForRoster,
  fetchUsersByTeamAndPosition,
} from "../../store/slices/rosterViewSlice";
import Spinner from "../common/Spinner";
import "./roster-table.css";

const RosterTable = () => {
  const dispatch = useAppDispatch();
  const { teamName, positionName: activePosition } = useParams();

  const { users, rosterDates, loadingUsers, loadingTeam, error } =
    useAppSelector((state) => state.rosterView);

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

  if (loadingUsers || loadingTeam) {
    return <Spinner />;
  }

  if (error) {
    return <div className="roster-table-error">Error: {error}</div>;
  }

  if (users.length === 0) {
    return (
      <div className="roster-table-loading">
        No users found for this position.
      </div>
    );
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

