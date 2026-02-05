import { useEffect, useState } from "react";

import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

import { db } from "../../firebase";
import { AppUser, Position } from "../../model/model";

import "./user-management.css";

type Gender = "Male" | "Female" | "";

const UserManagement = () => {
  const [users, setUsers] = useState<(AppUser & { id: string })[]>([]);
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userSnap, posSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "metadata")),
        ]);

        const userList = userSnap.docs
          .map((d) => ({ ...(d.data() as AppUser), id: d.id }))
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        const posList = posSnap.docs.flatMap((d) => {
          const data = d.data();
          if (data.list && Array.isArray(data.list)) {
            return data.list.map((p: Position) => ({
              name: p.name,
              emoji: p.emoji,
              colour: p.colour || "#444",
            }));
          }
          return [];
        }) as Position[];

        setUsers(userList);
        setAvailablePositions(posList);
      } catch (error) {
        console.error("Error loading admin data:", error);
      }
    };
    fetchData();
  }, []);

  const handleChange = <K extends keyof AppUser>(
    id: string,
    field: K,
    value: AppUser[K],
  ) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)),
    );
  };

  const togglePosition = (
    userId: string,
    currentPositions: string[] | undefined,
    posName: string,
  ) => {
    const safePositions = currentPositions || [];
    const updated = safePositions.includes(posName)
      ? safePositions.filter((p) => p !== posName)
      : [...safePositions, posName];

    handleChange(userId, "positions", updated);
  };

  const handleBulkSave = async () => {
    if (!window.confirm("Are you sure you want to save changes for all users?"))
      return;

    setIsSaving(true);
    const batch = writeBatch(db);

    users.forEach((user) => {
      const { id, ...data } = user;
      const userRef = doc(db, "users", id);
      batch.update(userRef, { ...data });
    });

    try {
      await batch.commit();
      alert("All users updated successfully!");
    } catch (e) {
      console.error("Bulk save failed:", e);
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Gender</th>
              <th>Positions</th>
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
                    className="admin-input-name"
                    value={u.name || ""}
                    onChange={(e) => handleChange(u.id, "name", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    value={u.email || ""}
                    readOnly
                    className="readonly-input"
                  />
                </td>
                <td>
                  <select
                    className="admin-select"
                    value={(u.gender as Gender) || ""}
                    onChange={(e) =>
                      handleChange(u.id, "gender", e.target.value as Gender)
                    }
                  >
                    <option value="">-</option>
                    <option value="Male">M</option>
                    <option value="Female">F</option>
                  </select>
                </td>
                <td>
                  <div className="admin-pos-tags">
                    {availablePositions.map((p) => {
                      const isActive = (u.positions || []).includes(p.name);
                      return (
                        <button
                          key={p.name}
                          title={p.name}
                          className={`pos-emoji-pill ${isActive ? "active" : ""}`}
                          style={{
                            backgroundColor: isActive
                              ? p.colour
                              : "transparent",
                            borderColor: isActive ? p.colour : "#444",
                          }}
                          onClick={() =>
                            togglePosition(u.id, u.positions, p.name)
                          }
                        >
                          {p.emoji}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td>
                  <button
                    className={`toggle-switch mini ${u.isActive ? "on" : "off"}`}
                    onClick={() => handleChange(u.id, "isActive", !u.isActive)}
                  >
                    {u.isActive ? "Y" : "N"}
                  </button>
                </td>
                <td>
                  <button
                    className={`toggle-switch mini ${u.isApproved ? "on" : "off"}`}
                    onClick={() =>
                      handleChange(u.id, "isApproved", !u.isApproved)
                    }
                  >
                    {u.isApproved ? "Y" : "N"}
                  </button>
                </td>
                <td>
                  <button
                    className={`toggle-switch mini ${u.isAdmin ? "on" : "off"}`}
                    onClick={() => handleChange(u.id, "isAdmin", !u.isAdmin)}
                  >
                    {u.isAdmin ? "Y" : "N"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-footer">
        <button
          className="save-button bulk"
          onClick={handleBulkSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save All Changes"}
        </button>
      </div>
    </div>
  );
};

export default UserManagement;
