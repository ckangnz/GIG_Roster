import { useState } from "react";

import { useTranslation } from "react-i18next";

import UserEditModal from "./UserEditModal";
import {
  SettingsTableAnyCell,
  SettingsTableInputCell,
} from "../../components/common/SettingsTable";
import SummaryCell from "../../components/common/SummaryCell";
import Toggle from "../../components/common/Toggle";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { AppUser, Gender, Team, OrgMembership } from "../../model/model";
import { selectUserData } from "../../store/slices/authSlice";
import { updateUserField, updateUserOrgField } from "../../store/slices/userManagementSlice";
import formStyles from "../../styles/form.module.css";
import styles from "../../styles/settings-common.module.css";

interface UserManagementRowProps {
  user: AppUser & { id: string };
  availableTeams: Team[];
  adminEmail: string;
}

const UserManagementRow = ({
  user,
  availableTeams,
  adminEmail,
}: UserManagementRowProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { firebaseUser } = useAppSelector((state) => state.auth);
  const { positions: globalPositions } = useAppSelector((state) => state.positions);
  const currentUser = useAppSelector(selectUserData);
  const activeOrgId = currentUser?.activeOrgId;

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUpdate = (
    field: keyof AppUser,
    value: AppUser[keyof AppUser],
  ) => {
    dispatch(updateUserField({ id: user.id, field, value }));
  };

  const handleOrgUpdate = (
    field: 'isActive' | 'isApproved' | 'isAdmin',
    value: boolean
  ) => {
    if (activeOrgId) {
      dispatch(updateUserOrgField({ userId: user.id, orgId: activeOrgId, field, value }));
    }
  };

  const orgs = user.organisations as Record<string, OrgMembership>;
  const orgMembership = activeOrgId ? orgs?.[activeOrgId] : null;
  const isActive = orgMembership?.isActive ?? true;
  const isApproved = orgMembership?.isApproved ?? false;
  const isAdmin = orgMembership?.isAdmin ?? false;

  const getTeamSummary = () => {
    const teams = orgMembership?.teams || [];
    if (teams.length === 0) {
      return t('common.none');
    }

    const teamEmojis = teams
      .map((tId: string) => {
        const team = availableTeams.find((t) => t.id === tId || t.name === tId);
        return team?.emoji || "";
      })
      .filter(Boolean);

    const displayEmojis = teamEmojis.slice(0, 3).map((emoji: string, i: number) => (
      <span key={i} className={styles.summaryEmoji}>
        {emoji}
      </span>
    ));
    const remainingCount = teamEmojis.length - 3;

    return (
      <>
        {displayEmojis}
        {remainingCount > 0 && (
          <span className={styles.remainingCount}>+{remainingCount}</span>
        )}
      </>
    );
  };

  const getPositionCount = () => {
    const teamPositions = orgMembership?.teamPositions || {};
    return Object.entries(teamPositions).reduce(
      (acc, [, posList]) => {
        const positions = posList as string[];
        const nonCustomPosList = positions.filter((posId: string) => {
          const gp = globalPositions.find(p => p.id === posId || p.name === posId);
          return !gp?.isCustom;
        });
        return acc + nonCustomPosList.length;
      },
      0,
    );
  };

  return (
    <>
      <tr key={user.id}>
        <SettingsTableInputCell
          name={`name-${user.id}`}
          value={user.name || ""}
          onChange={(e) => handleUpdate("name", e.target.value)}
          isSticky
          error={!(user.name || "").trim()}
          style={{ width: "100%" }}
        />
        <SettingsTableInputCell
          name={`email-${user.id}`}
          value={user.email || ""}
          isReadOnly
        />
        <SettingsTableAnyCell>
          <select
            name={`gender-${user.id}`}
            className={formStyles.formSelect}
            value={user.gender}
            onChange={(e) => handleUpdate("gender", e.target.value as Gender)}
          >
            <option value="">-</option>
            <option value="Male">{t('settings.male')}</option>
            <option value="Female">{t('settings.female')}</option>
          </select>
        </SettingsTableAnyCell>
        <SettingsTableAnyCell>
          <SummaryCell
            primaryText={getTeamSummary()}
            secondaryText={`(${getPositionCount()} pos)`}
            onClick={() => setIsModalOpen(true)}
          />
        </SettingsTableAnyCell>
        <SettingsTableAnyCell textAlign="center">
          <Toggle
            isOn={isActive}
            onToggle={(isOn) => handleOrgUpdate("isActive", isOn)}
          />
        </SettingsTableAnyCell>
        <SettingsTableAnyCell textAlign="center">
          <Toggle
            isOn={isApproved}
            onToggle={(isOn) => handleOrgUpdate("isApproved", isOn)}
            disabled={user.id === firebaseUser?.uid || isAdmin}
          />
        </SettingsTableAnyCell>
        <SettingsTableAnyCell textAlign="center">
          <Toggle
            isOn={isAdmin}
            onToggle={(isOn) => handleOrgUpdate("isAdmin", isOn)}
            disabled={user.email === adminEmail}
          />
        </SettingsTableAnyCell>
      </tr>

      <UserEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
        availableTeams={availableTeams}
      />
    </>
  );
};

export default UserManagementRow;
