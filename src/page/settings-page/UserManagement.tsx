import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";

import Pill, { PillGroup } from "../../components/common/Pill";
import { db } from "../../firebase";
import { AppUser, Gender, Position } from "../../model/model";
import "./user-management.css";

const UserManagement = () => {
  const [users, setUsers] = useState<(AppUser & { id: string })[]>([]);
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const userSnap = await getDocs(collection(db, "users"));
      const userList = userSnap.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as AppUser & { id: string },
      );
      setUsers(userList.sort((a, b) => a.name!.localeCompare(b.name!)));

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

  const handleUpdate = (
    id: string,
    field: keyof AppUser,
    value: AppUser[keyof AppUser],
  ) => {
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
    <>
      <div className="app-table-container">
        <table className="app-table">
          <thead>
            <tr>
              <th className="w-user-name sticky-col">Name</th>
              <th className="w-user-email">Email</th>
              <th className="w-user-gender">Gender</th>
              <th className="w-user-positions">Positions</th>
              <th className="w-user-status-cols">Active</th>
              <th className="w-user-status-cols">Approved</th>
              <th className="w-user-status-cols">Admin</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="w-user-name sticky-col">
                  <input
                    className="form-input"
                    value={u.name || ""}
                    onChange={(e) => handleUpdate(u.id, "name", e.target.value)}
                  />
                </td>
                <td className="w-user-email">
                  <input
                    className="form-input--readonly"
                    value={u.email || ""}
                    readOnly
                  />
                </td>
                <td className="w-user-gender">
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
                <td className="w-user-positions">
                  <PillGroup nowrap>
                    {availablePositions.map((pos) => {
                      const isActive = u.positions?.includes(pos.name);
                      return (
                        <Pill
                          key={pos.name}
                          colour={pos.colour}
                          isActive={isActive}
                          onClick={() => togglePosition(u.id, pos.name)}
                        >
                          {pos.emoji}
                        </Pill>
                      );
                    })}
                  </PillGroup>
                </td>
                <td className="w-user-status-cols">
                  <Pill
                    colour={
                      u.isActive
                        ? "var(--color-success-dark)"
                        : "var(--color-warning-dark)"
                    }
                    minWidth={35}
                    onClick={() => handleUpdate(u.id, "isActive", !u.isActive)}
                    isActive
                  >
                    {u.isActive ? "YES" : "NO"}
                  </Pill>
                </td>

                <td className="w-user-status-cols">
                  <Pill
                    colour={
                      u.isApproved
                        ? "var(--color-success-dark)"
                        : "var(--color-warning-dark)"
                    }
                    minWidth={35}
                    onClick={() =>
                      handleUpdate(u.id, "isApproved", !u.isApproved)
                    }
                    isActive
                  >
                    {u.isApproved ? "YES" : "NO"}
                  </Pill>
                </td>

                <td className="w-user-status-cols">
                  <Pill
                    colour={
                      u.isAdmin
                        ? "var(--color-success-dark)"
                        : "var(--color-warning-dark)"
                    }
                    minWidth={35}
                    onClick={() => handleUpdate(u.id, "isAdmin", !u.isAdmin)}
                    isActive
                  >
                    {u.isAdmin ? "YES" : "NO"}
                  </Pill>
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
    </>
  );
};

export default UserManagement;
