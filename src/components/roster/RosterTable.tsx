import { useState, useEffect } from "react";

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";

import { db } from "../../firebase";
import { AppUser, Team, Weekday } from "../../model/model";
import "./roster-table.css";

interface RosterTableProps {
  activePosition: string | null;
  teamName: string | null;
}

const getUpcomingDates = (preferredDays: Weekday[]): Date[] => {
  const dates: Date[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const currentYear = now.getFullYear();
  const endOfYear = new Date(currentYear, 11, 31);
  endOfYear.setHours(0, 0, 0, 0);

  const weekdayMap: Record<Weekday, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const preferredDayNumbers = preferredDays.map((day) => weekdayMap[day]);

  const startDate = new Date(now);
  let foundFirstDate = false;
  while (!foundFirstDate) {
    if (preferredDayNumbers.includes(startDate.getDay())) {
      foundFirstDate = true;
    } else {
      startDate.setDate(startDate.getDate() + 1);
      if (startDate.getFullYear() > currentYear) {
        return [];
      }
    }
  }

  const currentDate = new Date(startDate);
  while (currentDate.getTime() <= endOfYear.getTime()) {
    if (preferredDayNumbers.includes(currentDate.getDay())) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  dates.sort((a, b) => a.getTime() - b.getTime());

  return dates;
};

const RosterTable = ({ activePosition, teamName }: RosterTableProps) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [teamData, setTeamData] = useState<Team | null>(null);
  const [rosterDates, setRosterDates] = useState<Date[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [loadingTeam, setLoadingTeam] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  console.log(teamData);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      setError(null);
      setUsers([]);

      if (!activePosition) {
        setLoadingUsers(false);
        return;
      }

      try {
        const usersCollectionRef = collection(db, "users");
        const q = query(
          usersCollectionRef,
          where("positions", "array-contains", activePosition),
        );
        const querySnapshot = await getDocs(q);
        const fetchedUsers: AppUser[] = [];
        querySnapshot.forEach((doc) => {
          fetchedUsers.push(doc.data() as AppUser);
        });

        fetchedUsers.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setUsers(fetchedUsers);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users.");
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [activePosition]);

  useEffect(() => {
    const fetchTeamData = async () => {
      setLoadingTeam(true);
      setTeamData(null);
      setRosterDates([]);

      if (!teamName) {
        setLoadingTeam(false);
        return;
      }

      try {
        const teamsDocRef = doc(db, "metadata", "teams");
        const teamsSnap = await getDoc(teamsDocRef);

        if (teamsSnap.exists()) {
          const data = teamsSnap.data();
          const allTeamsList = Array.isArray(data.list)
            ? data.list.map((teamData: Team) => ({
                ...teamData,
                preferredDays: teamData.preferredDays || [],
                positions: teamData.positions || [],
              }))
            : [];

          const foundTeam = allTeamsList.find((team) => team.name === teamName);

          if (foundTeam) {
            setTeamData(foundTeam);

            if (foundTeam.preferredDays && foundTeam.preferredDays.length > 0) {
              setRosterDates(getUpcomingDates(foundTeam.preferredDays));
            }
          } else {
            setError(`Team "${teamName}" not found in metadata/teams.`);
          }
        } else {
          setError("Metadata teams document not found.");
        }
      } catch (err) {
        console.error("Error fetching team data:", err);
        setError("Failed to load team data.");
      } finally {
        setLoadingTeam(false);
      }
    };

    fetchTeamData();
  }, [teamName]);

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
          {rosterDates.map((date) => (
            <tr key={date.toISOString()}>
              <td>{date.toLocaleDateString()}</td>
              {users.map((user) => (
                <td key={user.email}>
                  {/* Placeholder for user data for this date */}
                  {/* For now, just user email, but this will be where availability/assignments go */}
                  -
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RosterTable;
