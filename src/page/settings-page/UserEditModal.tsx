import TeamPositionEditor from "./TeamPositionEditor";
import Modal from "../../components/common/Modal";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { AppUser, Team } from "../../model/model";
import { toggleUserTeam, toggleUserTeamPosition, moveUserTeam } from "../../store/slices/userManagementSlice";

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser & { id: string };
  availableTeams: Team[];
}

const UserEditModal = ({ isOpen, onClose, user, availableTeams }: UserEditModalProps) => {
  const dispatch = useAppDispatch();
  const { positions: globalPositions } = useAppSelector((state) => state.positions);

  const handleToggleTeam = (teamName: string) => {
    dispatch(toggleUserTeam({ userId: user.id, teamName }));
  };

  const handleTogglePosition = (teamName: string, posName: string) => {
    dispatch(toggleUserTeamPosition({ userId: user.id, teamName, posName }));
  };

  const handleMoveTeam = (teamName: string, direction: "up" | "down") => {
    dispatch(moveUserTeam({ userId: user.id, teamName, direction }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Assignments: ${user.name}`}>
      <TeamPositionEditor
        selectedTeams={user.teams || []}
        teamPositions={user.teamPositions || {}}
        onToggleTeam={handleToggleTeam}
        onTogglePosition={handleTogglePosition}
        onMoveTeam={handleMoveTeam}
        availableTeams={availableTeams}
        globalPositions={globalPositions}
      />
    </Modal>
  );
};

export default UserEditModal;
