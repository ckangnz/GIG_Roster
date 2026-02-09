import { useEffect } from "react";

import UserManagementRow from "./UserManagementRow";
import SettingsTable from "../../components/common/SettingsTable";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import {
  fetchAllUsers,
  saveAllUserChanges,
} from "../../store/slices/userManagementSlice";

const UserManagement = () => {
  const dispatch = useAppDispatch();
  const { allUsers, loading, saving, error } = useAppSelector(
    (state) => state.userManagement,
  );
  const availableTeams = useAppSelector((state) => state.teams.teams);

  useEffect(() => {
    dispatch(fetchAllUsers());
  }, [dispatch]);

  const handleSaveChanges = () => {
    dispatch(saveAllUserChanges(allUsers));
  };

  if (loading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

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
        {allUsers.map((u) => (
          <UserManagementRow
            key={u.id}
            user={u}
            availableTeams={availableTeams}
            adminEmail={import.meta.env.VITE_ADMIN_EMAIL as string}
          />
        ))}
      </SettingsTable>

      <div className="settings-footer">
        <button
          className={`save-button ${saving ? "saving" : ""}`}
          onClick={handleSaveChanges}
          disabled={saving}
        >
          {saving ? "Saving Changes..." : "Save All User Changes"}
        </button>
      </div>
    </>
  );
};

export default UserManagement;
