import { useState } from "react";

import UserEditModal from "./UserEditModal";
import Pill from "../../components/common/Pill";
import {
  SettingsTableAnyCell,
  SettingsTableInputCell,
} from "../../components/common/SettingsTable";
import { useAppDispatch } from "../../hooks/redux";
import { AppUser, Gender, Team } from "../../model/model";
import { updateUserField } from "../../store/slices/userManagementSlice";

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUpdate = (
    field: keyof AppUser,
    value: AppUser[keyof AppUser],
  ) => {
    dispatch(updateUserField({ id: user.id, field, value }));
  };

  const getTeamSummary = () => {
    if (!user.teams || user.teams.length === 0) return "No teams";
    return user.teams
      .map((tName) => {
        const team = availableTeams.find((t) => t.name === tName);
        return team?.emoji || "";
      })
      .join(" ");
  };

  const getPositionCount = () => {
    if (!user.teamPositions) return 0;
    return Object.values(user.teamPositions).reduce(
      (acc, posList) => acc + posList.length,
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
            className="form-select"
            value={user.gender}
            onChange={(e) => handleUpdate("gender", e.target.value as Gender)}
          >
            <option value="">-</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </SettingsTableAnyCell>
        <SettingsTableAnyCell>
          <button
            className="icon-button icon-button--secondary"
            style={{
              width: "100%",
              justifyContent: "flex-start",
              padding: "8px 12px",
            }}
            onClick={() => setIsModalOpen(true)}
          >
            <span style={{ fontSize: "1.1rem", marginRight: "8px" }}>
              {getTeamSummary()}
            </span>
            <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
              ({getPositionCount()} pos)
            </span>
          </button>
        </SettingsTableAnyCell>
        <SettingsTableAnyCell>
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
        <SettingsTableAnyCell>
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
        <SettingsTableAnyCell>
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
