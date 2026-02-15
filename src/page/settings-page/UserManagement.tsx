import { useEffect, useMemo } from "react";

import UserManagementRow from "./UserManagementRow";
import SaveFooter from "../../components/common/SaveFooter";
import SettingsTable from "../../components/common/SettingsTable";
import Spinner from "../../components/common/Spinner";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import {
  fetchAllUsers,
  saveAllUserChanges,
  resetUserChanges,
} from "../../store/slices/userManagementSlice";

const UserManagement = () => {
  const dispatch = useAppDispatch();
  const { allUsers, originalUsers, loading, saving, error } = useAppSelector(
    (state) => state.userManagement,
  );
  const availableTeams = useAppSelector((state) => state.teams.teams);

  const hasChanges = useMemo(() => {
    return JSON.stringify(allUsers) !== JSON.stringify(originalUsers);
  }, [allUsers, originalUsers]);

  useEffect(() => {
    dispatch(fetchAllUsers());
  }, [dispatch]);

  const handleSaveChanges = () => {
    dispatch(saveAllUserChanges(allUsers));
  };

  const handleCancelChanges = () => {
    dispatch(resetUserChanges());
  };

  if (loading) {
    return <Spinner />;
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

      {hasChanges && (
        <SaveFooter
          label="Unsaved user changes"
          saveText="Save All User Changes"
          onSave={handleSaveChanges}
          onCancel={handleCancelChanges}
          isSaving={saving}
        />
      )}
    </>
  );
};

export default UserManagement;
