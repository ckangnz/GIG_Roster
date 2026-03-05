import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import UserManagementRow from "./UserManagementRow";
import SaveFooter from "../../components/common/SaveFooter";
import SettingsTable, {
  SettingsTableHeaderProps,
} from "../../components/common/SettingsTable";
import Spinner from "../../components/common/Spinner";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { OrgMembership } from "../../model/model";
import {
  saveAllUserChanges,
  resetUserChanges,
} from "../../store/slices/userManagementSlice";

import styles from "./settings-page.module.css";

const UserManagement = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const { allUsers, originalUsers, memberships, originalMemberships, loading, saving, error } = useAppSelector(
    (state) => state.userManagement,
  );
  const availableTeams = useAppSelector((state) => state.teams.teams);

  const hasChanges = useMemo(() => {
    // 1. Check for basic user profile changes (name, gender)
    const hasProfileChanges = JSON.stringify(allUsers.map(u => ({ id: u.id, name: u.name, gender: u.gender }))) !== 
                             JSON.stringify(originalUsers.map(u => ({ id: u.id, name: u.name, gender: u.gender })));
    
    if (hasProfileChanges) return true;

    // 2. Check for membership changes
    // We normalize to ensure key order doesn't trigger false positives
    const normalizeMem = (m: Record<string, OrgMembership>) => {
      return Object.keys(m).sort().reduce((acc: Record<string, unknown>, userId) => {
        const entry = m[userId];
        acc[userId] = {
          isActive: !!entry.isActive,
          isApproved: !!entry.isApproved,
          isAdmin: !!entry.isAdmin,
          teams: [...(entry.teams || [])].sort(),
          teamPositions: Object.keys(entry.teamPositions || {}).sort().reduce((tpAcc: Record<string, string[]>, teamId) => {
            tpAcc[teamId] = [...(entry.teamPositions?.[teamId] || [])].sort();
            return tpAcc;
          }, {})
        };
        return acc;
      }, {});
    };

    return JSON.stringify(normalizeMem(memberships)) !== JSON.stringify(normalizeMem(originalMemberships));
  }, [allUsers, originalUsers, memberships, originalMemberships]);

  const isFormValid = useMemo(() => {
    return allUsers.every((u) => (u.name || "").trim() !== "");
  }, [allUsers]);

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

  const pendingUsers = allUsers.filter((u) => {
    const mem = memberships[u.id];
    return mem && !mem.isApproved;
  });
  const approvedUsers = allUsers.filter((u) => {
    const mem = memberships[u.id];
    return mem && mem.isApproved;
  });

  const tableHeaders: SettingsTableHeaderProps[] = [
    {
      text: t("management.user.name"),
      minWidth: 70,
      width: 100,
      textAlign: "center",
      isRequired: true,
    },
    { text: t("management.user.email"), minWidth: 170, textAlign: "center" },
    { text: t("management.user.gender"), minWidth: 90, textAlign: "center" },
    { text: t("management.user.teams"), minWidth: 150, textAlign: "center" },
    { text: t("settings.active"), minWidth: 95, textAlign: "center" },
    { text: t("management.user.approve"), minWidth: 95, textAlign: "center" },
    { text: t("management.user.admin"), minWidth: 95, textAlign: "center" },
  ];

  return (
    <div className={styles.managementWrapper}>
      {pendingUsers.length > 0 && (
        <div className={styles.pendingSection}>
          <h2 className={styles.pendingTitle}>
            {t("management.user.pending")} ({pendingUsers.length})
          </h2>
          <SettingsTable headers={tableHeaders}>
            {pendingUsers.map((u) => (
              <UserManagementRow
                key={u.id}
                user={u}
                availableTeams={availableTeams}
                adminEmail={import.meta.env.VITE_ADMIN_EMAIL as string}
              />
            ))}
          </SettingsTable>
        </div>
      )}

      <div className={styles.approvedSection}>
        <h2 className={styles.sectionTitle}>
          {t("management.user.approved")} ({approvedUsers.length})
        </h2>
        <SettingsTable headers={tableHeaders}>
          {approvedUsers.map((u) => (
            <UserManagementRow
              key={u.id}
              user={u}
              availableTeams={availableTeams}
              adminEmail={import.meta.env.VITE_ADMIN_EMAIL as string}
            />
          ))}
        </SettingsTable>
      </div>

      {hasChanges && (
        <SaveFooter
          label={t("management.user.unsavedChanges")}
          saveText={t("management.user.saveAll")}
          onSave={handleSaveChanges}
          onCancel={handleCancelChanges}
          isSaving={saving}
          isDisabled={!isFormValid}
        />
      )}
    </div>
  );
};

export default UserManagement;
