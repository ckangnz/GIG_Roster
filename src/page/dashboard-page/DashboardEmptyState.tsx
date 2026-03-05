import React from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import EmptyState from "../../components/common/EmptyState";
import {
  NoTeamsIllustration,
  NoAssignmentsIllustration,
  AllExpiredIllustration,
  NoFutureDataIllustration
} from "../../components/common/EmptyStateIllustrations";

export type EmptyStateType = "no-teams" | "no-assignments" | "no-future-data" | "all-expired";

interface DashboardEmptyStateProps {
  type: EmptyStateType;
  isAdmin: boolean;
}

const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({ type, isAdmin }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getProps = () => {
    switch (type) {
      case "no-teams":
        return {
          illustration: <NoTeamsIllustration />,
          title: t("dashboard.empty.noTeamsTitle"),
          description: t("dashboard.empty.noTeamsDesc"),
          instruction: {
            text: isAdmin ? t("dashboard.empty.noTeamsAdmin") : t("dashboard.empty.noTeamsMember"),
            action: isAdmin ? { label: t("settings.profile"), onClick: () => navigate("/app/settings/profile") } : undefined
          }
        };
      case "no-assignments":
        return {
          illustration: <NoAssignmentsIllustration />,
          title: t("dashboard.empty.noAssignmentsTitle"),
          description: t("dashboard.empty.noAssignmentsDesc"),
          instruction: {
            text: isAdmin ? t("dashboard.empty.noAssignmentsAdmin") : t("dashboard.empty.noAssignmentsMember"),
            action: isAdmin ? { label: t("nav.roster"), onClick: () => navigate("/app/roster") } : undefined
          }
        };
      case "all-expired":
        return {
          illustration: <AllExpiredIllustration />,
          title: t("dashboard.empty.allExpiredTitle"),
          description: t("dashboard.empty.allExpiredDesc"),
          instruction: {
            text: t("dashboard.empty.allExpiredInstruction"),
            action: { label: t("nav.roster"), onClick: () => navigate("/app/roster") }
          }
        };
      case "no-future-data":
      default:
        return {
          illustration: <NoFutureDataIllustration />,
          title: t("dashboard.empty.noFutureTitle"),
          description: t("dashboard.empty.noFutureDesc"),
          instruction: {
            text: isAdmin ? t("dashboard.empty.noFutureAdmin") : t("dashboard.empty.noFutureMember"),
            action: isAdmin ? { label: t("management.team.title"), onClick: () => navigate("/app/settings/teams") } : undefined
          }
        };
    }
  };

  const props = getProps();

  return <EmptyState {...props} />;
};

export default DashboardEmptyState;
