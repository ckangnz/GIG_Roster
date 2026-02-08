import Pill, { PillGroup } from "../../components/common/Pill";
import {
  SettingsTableAnyCell,
  SettingsTableInputCell,
} from "../../components/common/SettingsTable";
import { useComputedPositions } from "../../hooks/useComputedPositions";
import { AppUser, Gender, Team } from "../../model/model";

interface UserManagementRowProps {
  user: AppUser & { id: string };
  availableTeams: Team[];
  onTogglePosition: (userId: string, posName: string) => void;
  onToggleTeam: (userId: string, teamName: string) => void;
  onHandleUpdate: (
    id: string,
    field: keyof AppUser,
    value: AppUser[keyof AppUser],
  ) => void;
  adminEmail: string;
}

const UserManagementRow = ({
  user,
  availableTeams,
  onTogglePosition,
  onToggleTeam,
  onHandleUpdate,
  adminEmail,
}: UserManagementRowProps) => {
  const computedPositions = useComputedPositions(
    user.teams || [],
    availableTeams,
  );

  return (
    <tr key={user.id}>
      <SettingsTableInputCell
        name={`name-${user.id}`}
        value={user.name || ""}
        onChange={(e) => onHandleUpdate(user.id, "name", e.target.value)}
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
          onChange={(e) =>
            onHandleUpdate(user.id, "gender", e.target.value as Gender)
          }
        >
          <option value="">-</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </SettingsTableAnyCell>
      <SettingsTableAnyCell>
        <PillGroup nowrap>
          {availableTeams.map((team) => {
            const isSelected = user.teams?.includes(team.name);
            return (
              <Pill
                key={team.name}
                onClick={() => onToggleTeam(user.id, team.name)}
                isActive={isSelected}
              >
                <span>{team.emoji}</span> {team.name}
              </Pill>
            );
          })}
        </PillGroup>
      </SettingsTableAnyCell>
      <SettingsTableAnyCell>
        <PillGroup nowrap>
          {computedPositions.map((pos) => {
            const isSelected = user.positions?.includes(pos.name);
            return (
              <Pill
                key={pos.name}
                colour={pos.colour}
                isActive={isSelected}
                onClick={() => onTogglePosition(user.id, pos.name)}
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
            user.isActive
              ? "var(--color-success-dark)"
              : "var(--color-warning-dark)"
          }
          minWidth={35}
          onClick={() => onHandleUpdate(user.id, "isActive", !user.isActive)}
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
          onClick={() =>
            onHandleUpdate(user.id, "isApproved", !user.isApproved)
          }
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
          onClick={() => onHandleUpdate(user.id, "isAdmin", !user.isAdmin)}
          isActive
          isDisabled={user.email === adminEmail}
        >
          {user.isAdmin ? "YES" : "NO"}
        </Pill>
      </SettingsTableAnyCell>
    </tr>
  );
};

export default UserManagementRow;
