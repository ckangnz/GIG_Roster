import { useTranslation } from "react-i18next";

import TeamPositionEditor from "./TeamPositionEditor";
import Modal from "../../components/common/Modal";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { AppUser, Team, OrgMembership } from "../../model/model";
import { selectUserData } from "../../store/slices/authSlice";
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
  const currentUser = useAppSelector(selectUserData);
  const activeOrgId = currentUser?.activeOrgId;

  const handleToggleTeam = (teamName: string) => {
    if (activeOrgId) {
      dispatch(toggleUserTeam({ userId: user.id, orgId: activeOrgId, teamName }));
    }
  };

  const handleTogglePosition = (teamName: string, posName: string) => {
    if (activeOrgId) {
      dispatch(toggleUserTeamPosition({ userId: user.id, orgId: activeOrgId, teamName, posName }));
    }
  };

  const handleReorderTeams = (newOrder: string[]) => {
    if (activeOrgId) {
      dispatch(reorderUserTeams({ userId: user.id, orgId: activeOrgId, newOrder }));
    }
  };

  const orgs = user.organisations as Record<string, OrgMembership>;
  const membership = activeOrgId ? orgs?.[activeOrgId] : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('management.user.editTitle', { name: user.name })}>
      <TeamPositionEditor
        selectedTeams={membership?.teams || []}
        teamPositions={membership?.teamPositions || {}}
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
