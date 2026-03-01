import { useTranslation } from "react-i18next";

import TeamPositionEditor from "./TeamPositionEditor";
import Modal from "../../components/common/Modal";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { AppUser, Team } from "../../model/model";
import { toggleUserTeam, toggleUserTeamPosition, reorderUserTeams } from "../../store/slices/userManagementSlice";

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser & { id: string };
  availableTeams: Team[];
}

const UserEditModal = ({ isOpen, onClose, user, availableTeams }: UserEditModalProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { positions: globalPositions } = useAppSelector((state) => state.positions);

  const handleToggleTeam = (teamName: string) => {
    dispatch(toggleUserTeam({ userId: user.id, teamName }));
  };

  const handleTogglePosition = (teamName: string, posName: string) => {
    dispatch(toggleUserTeamPosition({ userId: user.id, teamName, posName }));
  };

  const handleReorderTeams = (newOrder: string[]) => {
    dispatch(reorderUserTeams({ userId: user.id, newOrder }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('management.user.editTitle', { name: user.name })}>
      <TeamPositionEditor
        selectedTeams={user.teams || []}
        teamPositions={user.teamPositions || {}}
        onToggleTeam={handleToggleTeam}
        onTogglePosition={handleTogglePosition}
        onReorderTeams={handleReorderTeams}
        availableTeams={availableTeams}
        globalPositions={globalPositions}
      />
    </Modal>
  );
};

export default UserEditModal;
