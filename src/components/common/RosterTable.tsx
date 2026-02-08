import { useState, useEffect } from "react";

import { collection, query, where, getDocs } from "firebase/firestore";

import { db } from "../../firebase";
import { AppUser } from "../../model/model";
import "./roster-table.css";

interface RosterTableProps {
  activePosition: string | null;
}

const RosterTable = ({ activePosition }: RosterTableProps) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  console.log(activePosition);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      setUsers([]);

      if (!activePosition) {
        setLoading(false);
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
        // Sort users alphabetically by name
        fetchedUsers.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setUsers(fetchedUsers);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [activePosition]);

  if (loading) {
    return <div className="roster-table-loading">Loading users...</div>;
  }

  if (error) {
    return <div className="roster-table-error">Error: {error}</div>;
  }

  return (
    <div className="roster-table-container">
      <table className="roster-table">
        <thead>
          <tr>
            <th className="roster-table-header-cell">Time</th>
            {users.map((user) => (
              <th key={user.email} className="roster-table-header-cell">
                {user.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Example Time Slot</td>
            {users.map((user) => (
              <td key={user.email}>
                {/* Placeholder for user data */}
                {user.email}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default RosterTable;
