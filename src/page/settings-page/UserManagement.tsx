import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";

import Pill, { PillGroup } from "../../components/common/Pill";
import SettingsTable, {
  SettingsTableAnyCell,
  SettingsTableInputCell,
} from "../../components/common/SettingsTable";
import { db } from "../../firebase";
import { AppUser, Gender, Position } from "../../model/model";

const UserManagement = () => {
  const [users, setUsers] = useState<(AppUser & { id: string })[]>([]);
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [status, setStatus] = useState("idle"); // Changed from isSaving to status

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
    setStatus("saving"); // Set status to saving
    const batch = writeBatch(db);
    users.forEach((u) => {
      const { id, ...data } = u;
      batch.update(doc(db, "users", id), data);
    });
    try {
      await batch.commit();
      setStatus("success"); // Set status to success
      setTimeout(() => setStatus("idle"), 2000); // Reset to idle after 2 seconds
    } catch (e) {
      console.error(e);
      alert("Error saving users."); // Keep alert for error, or change to status="error" if desired
      setStatus("idle"); // Reset to idle on error
    }
  };

  return (
    <>
      <SettingsTable
        headers={[
          { text: "Name", minWidth: 70, isSticky: true },
          { text: "Email", minWidth: 170 },
          { text: "Gender", minWidth: 90 },
          { text: "Positions", minWidth: 150 },
          { text: "Admin", minWidth: 95, textAlign: "center" },
          { text: "Admin", minWidth: 95, textAlign: "center" },
          { text: "Admin", minWidth: 95, textAlign: "center" },
        ]}
      >
        {users.map((u) => (
          <tr key={u.id}>
            <SettingsTableInputCell
              name={`name-${u.id}`}
              value={u.name || ""}
              onChange={(e) => handleUpdate(u.id, "name", e.target.value)}
              isSticky
            />
            <SettingsTableInputCell
              name={`email-${u.id}`}
              value={u.email || ""}
              isReadOnly
            />
            <SettingsTableAnyCell>
              <select
                name={`gender-${u.id}`}
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
            </SettingsTableAnyCell>
            <SettingsTableAnyCell>
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
            </SettingsTableAnyCell>
            <SettingsTableAnyCell>
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
            </SettingsTableAnyCell>
            <SettingsTableAnyCell>
              <Pill
                colour={
                  u.isApproved
                    ? "var(--color-success-dark)"
                    : "var(--color-warning-dark)"
                }
                minWidth={35}
                onClick={() => handleUpdate(u.id, "isApproved", !u.isApproved)}
                isActive
              >
                {u.isApproved ? "YES" : "NO"}
              </Pill>
            </SettingsTableAnyCell>
            <SettingsTableAnyCell>
              <Pill
                colour={
                  u.isAdmin
                    ? "var(--color-success-dark)"
                    : "var(--color-warning-dark)"
                }
                minWidth={35}
                onClick={() => handleUpdate(u.id, "isAdmin", !u.isAdmin)}
                isActive
                isDisabled={u.email === import.meta.env.VITE_ADMIN_EMAIL}
              >
                {u.isAdmin ? "YES" : "NO"}
              </Pill>
            </SettingsTableAnyCell>
          </tr>
        ))}
      </SettingsTable>

      <div className="settings-footer">
        <button
          className={`save-button ${status}`}
          onClick={saveAllChanges}
          disabled={status !== "idle"}
        >
          {status === "saving"
            ? "Saving Changes..."
            : status === "success"
              ? "Done ✓"
              : "Save All User Changes"}
        </button>
      </div>
    </>
  );
};

export default UserManagement;
