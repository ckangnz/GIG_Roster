import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase";
import { AppUser, Gender, Position } from "../../model/model";
import "./user-management.css";

const UserManagement = () => {
  const [users, setUsers] = useState<(AppUser & { id: string })[]>([]);
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch Users
      const userSnap = await getDocs(collection(db, "users"));
      const userList = userSnap.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as AppUser & { id: string },
      );
      setUsers(userList);

      // Fetch Global Positions for the pills
      const posSnap = await getDoc(doc(db, "metadata", "positions"));
      if (posSnap.exists()) {
        setAvailablePositions(posSnap.data().list || []);
      }
    };
    fetchData();
  }, []);

  const togglePosition = (userId: string, posName: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const currentPos = u.positions || [];
        const newPos = currentPos.includes(posName)
          ? currentPos.filter((p) => p !== posName)
          : [...currentPos, posName];
        return { ...u, positions: newPos };
      }),
    );
  };

  const handleUpdate = (id: string, field: keyof AppUser, value: AppUser[keyof AppUser]) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)),
    );
  };

  const saveAllChanges = async () => {
    setIsSaving(true);
    const batch = writeBatch(db);
    users.forEach((u) => {
      const { id, ...data } = u;
      batch.update(doc(db, "users", id), data);
    });
    try {
      await batch.commit();
      alert("All users updated successfully!");
    } catch (e) {
      console.error(e);
      alert("Error saving users.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="app-table-container">
        <table className="app-table">
          <thead>
            <tr>
              <th className="sticky-col">Name</th>
              <th>Email</th>
              <th>Gender</th>
              <th className="w-positions">Positions</th>
              <th>Active</th>
              <th>Approved</th>
              <th>Admin</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="sticky-col">
                  <input
                    className="form-input"
                    value={u.name || ""}
                    onChange={(e) => handleUpdate(u.id, "name", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="form-input--readonly"
                    value={u.email || ""}
                    readOnly
                  />
                </td>
                <td>
                  <select
                    className="form-select"
                    value={u.gender}
                    onChange={(e) =>
                      handleUpdate(u.id, "gender", e.target.value as Gender)
                    }
                  >
                    <option value="">-</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </td>
                <td className="pos-pills-cell">
                  <div className="pos-pills-wrapper">
                    {availablePositions.map((pos) => {
                      const isActive = u.positions?.includes(pos.name);
                      return (
                        <button
                          key={pos.name}
                          className={`pill pill--emoji ${isActive ? "is-active" : ""}`}
                          onClick={() => togglePosition(u.id, pos.name)}
                          style={{
                            '--pos-subtle-hover-color': `${pos.colour}15`, // Subtle hover color
                            borderColor: isActive ? pos.colour : "transparent",
                            backgroundColor: isActive ? `${pos.colour}20` : "",
                          } as React.CSSProperties}
                          title={pos.name}
                        >
                          {pos.emoji}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="center">
                  <div
                    className={`badge ${u.isActive ? "badge--yes" : "badge--no"}`}
                    onClick={() => handleUpdate(u.id, "isActive", !u.isActive)}
                  >
                    {u.isActive ? "YES" : "NO"}
                  </div>
                </td>

                <td className="center">
                  <div
                    className={`badge ${u.isApproved ? "badge--yes" : "badge--no"}`}
                    onClick={() =>
                      handleUpdate(u.id, "isApproved", !u.isApproved)
                    }
                  >
                    {u.isApproved ? "YES" : "NO"}
                  </div>
                </td>

                <td className="center">
                  <div
                    className={`badge ${u.isAdmin ? "badge--yes" : "badge--no"}`}
                    onClick={() => handleUpdate(u.id, "isAdmin", !u.isAdmin)}
                  >
                    {u.isAdmin ? "YES" : "NO"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="settings-footer">
        <button
          className="save-button is-bulk"
          onClick={saveAllChanges}
          disabled={isSaving}
        >
          {isSaving ? "Saving Changes..." : "Save All User Changes"}
        </button>
      </div>
    </div>
  );
};

export default UserManagement;
