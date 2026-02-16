import Modal from "../../components/common/Modal";
import Pill, { PillGroup } from "../../components/common/Pill";
import { useAppDispatch } from "../../hooks/redux";
import { AppUser, Team } from "../../model/model";
import { toggleUserTeam, toggleUserTeamPosition } from "../../store/slices/userManagementSlice";

import styles from "./profile-settings.module.css";

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser & { id: string };
  availableTeams: Team[];
}

const UserEditModal = ({ isOpen, onClose, user, availableTeams }: UserEditModalProps) => {
  const dispatch = useAppDispatch();

  const handleToggleTeam = (teamName: string) => {
    dispatch(toggleUserTeam({ userId: user.id, teamName }));
  };

  const handleTogglePosition = (teamName: string, posName: string) => {
    dispatch(toggleUserTeamPosition({ userId: user.id, teamName, posName }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Assignments: ${user.name}`}>
      <div className={styles.formGroup}>
        <label className={styles.sectionLabel}>Teams</label>
        <PillGroup>
          {availableTeams.map((team) => {
            const isSelected = user.teams?.includes(team.name);
            return (
              <Pill
                key={team.name}
                onClick={() => handleToggleTeam(team.name)}
                isActive={isSelected}
              >
                <span>{team.emoji}</span> {team.name}
              </Pill>
            );
          })}
        </PillGroup>
      </div>

      {user.teams && user.teams.length > 0 && (
        <div className={styles.teamPositionsSection}>
          <label className={styles.sectionLabel}>Positions per Team</label>
          {user.teams.map((teamName) => {
            const team = availableTeams.find((t) => t.name === teamName);
            if (!team) return null;

            return (
              <div key={teamName} style={{ marginBottom: '24px' }}>
                <div className={styles.teamPositionHeader}>
                  {team.emoji} {team.name}
                </div>
                <PillGroup>
                  {team.positions
                    ?.filter((pos) => !pos.parentId)
                    ?.map((pos) => {
                      const isSelected = user.teamPositions?.[teamName]?.includes(pos.name);
                      return (
                        <Pill
                          key={pos.name}
                          onClick={() => handleTogglePosition(teamName, pos.name)}
                          isActive={isSelected}
                          colour={pos.colour}
                        >
                          <span>{pos.emoji}</span> {pos.name}
                        </Pill>
                      );
                    })}
                </PillGroup>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

export default UserEditModal;
