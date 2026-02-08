import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";

import UserManagementRow from "./UserManagementRow";
import SettingsTable from "../../components/common/SettingsTable";
import { db } from "../../firebase";
import { AppUser, Team } from "../../model/model";

const UserManagement = () => {
  const [users, setUsers] = useState<(AppUser & { id: string })[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const fetchData = async () => {
      const userSnap = await getDocs(collection(db, "users"));
      const userList = userSnap.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as AppUser & { id: string },
      );
      setUsers(userList.sort((a, b) => a.name!.localeCompare(b.name!)));

      const teamsDocRef = await getDoc(doc(db, "metadata", "teams"));
      if (teamsDocRef.exists()) {
        const data = teamsDocRef.data();
        setAvailableTeams(
          Array.isArray(data.list)
            ? data.list.map((team: Team) => ({
                ...team,
                preferredDays: team.preferredDays || [],
              }))
            : [],
        );
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

  const toggleTeam = (userId: string, teamName: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const currentTeams = u.teams || [];
        const newTeams = currentTeams.includes(teamName)
          ? currentTeams.filter((t) => t !== teamName)
          : [...currentTeams, teamName];
        return { ...u, teams: newTeams };
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
    setStatus("saving");
    const batch = writeBatch(db);
    users.forEach((u) => {
      const { id, ...data } = u;
      batch.update(doc(db, "users", id), data);
    });
    try {
      await batch.commit();
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      console.error(e);
      alert("Error saving users.");
      setStatus("idle");
    }
  };

  return (
    <>
      <SettingsTable
        headers={[
          { text: "Name", minWidth: 70, isSticky: true },
          { text: "Email", minWidth: 170 },
          { text: "Gender", minWidth: 90 },
          { text: "Teams", minWidth: 200 },
          { text: "Positions", minWidth: 200 },
          { text: "Active", minWidth: 95, textAlign: "center" },
          { text: "Approved", minWidth: 95, textAlign: "center" },
          { text: "Admin", minWidth: 95, textAlign: "center" },
        ]}
      >
        {users.map((u) => (
          <UserManagementRow
            key={u.id}
            user={u}
            availableTeams={availableTeams}
            onTogglePosition={togglePosition}
            onToggleTeam={toggleTeam}
            onHandleUpdate={handleUpdate}
            adminEmail={import.meta.env.VITE_ADMIN_EMAIL}
          />
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
