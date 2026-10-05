import { useTranslation } from "react-i18next";

import SearchableMultiPicker from "../../components/common/SearchableMultiPicker";
import { Team } from "../../model/model";
import formStyles from "../../styles/form.module.css";

interface ViewedTeamsEditorProps {
  availableTeams: Team[];
  selectedTeams: string[];
  onToggleTeam: (teamId: string) => void;
}

const ViewedTeamsEditor = ({
  availableTeams,
  selectedTeams,
  onToggleTeam,
}: ViewedTeamsEditorProps) => {
  const { t } = useTranslation();

  return (
    <div className={formStyles.formGroup}>
      <label>{t("settings.viewedTeams")}</label>
      <SearchableMultiPicker
        items={availableTeams.map((team) => ({
          id: team.id,
          label: team.name,
          emoji: team.emoji,
        }))}
        selectedIds={selectedTeams}
        onToggle={onToggleTeam}
        placeholder={t("settings.viewedTeamsPlaceholder")}
        emptyMessage={t("settings.noTeamsInOrg")}
      />
      <p className={formStyles.fieldHint}>{t("settings.viewedTeamsHint")}</p>
    </div>
  );
};

export default ViewedTeamsEditor;
