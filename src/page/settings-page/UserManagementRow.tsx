import { useState } from "react";

import UserEditModal from "./UserEditModal";
import Pill from "../../components/common/Pill";
import {
  SettingsTableAnyCell,
  SettingsTableInputCell,
} from "../../components/common/SettingsTable";
import SummaryCell from "../../components/common/SummaryCell";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { AppUser, Gender, Team } from "../../model/model";
import { updateUserField } from "../../store/slices/userManagementSlice";
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
  const dispatch = useAppDispatch();
  const { positions: globalPositions } = useAppSelector((state) => state.positions);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUpdate = (
    field: keyof AppUser,
    value: AppUser[keyof AppUser],
  ) => {
    dispatch(updateUserField({ id: user.id, field, value }));
  };

  const getTeamSummary = () => {
    if (!user.teams || user.teams.length === 0) {
      return "No teams";
    }

    const teamEmojis = user.teams
      .map((tName) => {
        const team = availableTeams.find((t) => t.name === tName);
        return team?.emoji || "";
      })
      .filter(Boolean);

    const displayEmojis = teamEmojis.slice(0, 3).map((emoji, i) => (
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
    if (!user.teamPositions) return 0;
    return Object.entries(user.teamPositions).reduce(
      (acc, [, posList]) => {
        const nonCustomPosList = posList.filter(posName => {
          const gp = globalPositions.find(p => p.name === posName);
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
            <option value="Male">Male</option>
            <option value="Female">Female</option>
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
          <Pill
            colour={
              user.isActive
                ? "var(--color-success-dark)"
                : "var(--color-warning-dark)"
            }
            minWidth={35}
            onClick={() => handleUpdate("isActive", !user.isActive)}
            isActive
          >
            {user.isActive ? "YES" : "NO"}
          </Pill>
        </SettingsTableAnyCell>
        <SettingsTableAnyCell textAlign="center">
          <Pill
            colour={
              user.isApproved
                ? "var(--color-success-dark)"
                : "var(--color-warning-dark)"
            }
            minWidth={35}
            onClick={() => handleUpdate("isApproved", !user.isApproved)}
            isActive
          >
            {user.isApproved ? "YES" : "NO"}
          </Pill>
        </SettingsTableAnyCell>
        <SettingsTableAnyCell textAlign="center">
          <Pill
            colour={
              user.isAdmin
                ? "var(--color-success-dark)"
                : "var(--color-warning-dark)"
            }
            minWidth={35}
            onClick={() => handleUpdate("isAdmin", !user.isAdmin)}
            isActive
            isDisabled={user.email === adminEmail}
          >
            {user.isAdmin ? "YES" : "NO"}
          </Pill>
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
