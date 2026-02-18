import { useMemo } from "react";

import UserManagementRow from "./UserManagementRow";
import SaveFooter from "../../components/common/SaveFooter";
import SettingsTable from "../../components/common/SettingsTable";
import Spinner from "../../components/common/Spinner";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { AppUser } from "../../model/model";
import {
  saveAllUserChanges,
  resetUserChanges,
} from "../../store/slices/userManagementSlice";

import styles from "./settings-page.module.css";

const UserManagement = () => {
  const dispatch = useAppDispatch();
  const { allUsers, originalUsers, loading, saving, error } = useAppSelector(
    (state) => state.userManagement,
  );
  const availableTeams = useAppSelector((state) => state.teams.teams);

  const hasChanges = useMemo(() => {
    const normalize = (list: AppUser[]) =>
      list.map((u) => ({
        name: u.name || "",
        gender: u.gender || "",
        teams: [...(u.teams || [])].sort(),
        teamPositions: Object.keys(u.teamPositions || {})
          .sort()
          .reduce((acc: Record<string, string[]>, team) => {
            acc[team] = [...(u.teamPositions?.[team] || [])].sort();
            return acc;
          }, {}),
        isActive: !!u.isActive,
        isApproved: !!u.isApproved,
        isAdmin: !!u.isAdmin,
      }));
    return (
      JSON.stringify(normalize(allUsers)) !==
      JSON.stringify(normalize(originalUsers))
    );
  }, [allUsers, originalUsers]);

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
    <div className={styles.managementWrapper}>
      <SettingsTable
        headers={[
          { text: "Name", minWidth: 70, width: 100, textAlign: "center" },
          { text: "Email", minWidth: 170, textAlign: "center" },
          { text: "Gender", minWidth: 90, textAlign: "center" },
          { text: "Assignments", minWidth: 150, textAlign: "center" },
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
    </div>
  );
};

export default UserManagement;
