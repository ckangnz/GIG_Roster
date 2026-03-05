import { useTranslation } from "react-i18next";

import SearchableMultiPicker from "../../components/common/SearchableMultiPicker";
import {
  SortableList,
  SortableItem,
} from "../../components/common/SortableList";
import { Position, Team } from "../../model/model";
import commonStyles from "../../styles/settings-common.module.css";

interface TeamPositionEditorProps {
  selectedTeams: string[];
  teamPositions: Record<string, string[]>;
  onToggleTeam: (teamName: string) => void;
  onTogglePosition: (teamName: string, posName: string) => void;
  onReorderTeams?: (newOrder: string[]) => void;
  availableTeams: Team[];
  globalPositions: Position[];
}

const ReorderableTeamItem = ({
  teamName,
  team,
  allTopLevelPositions,
  teamPositions,
  onTogglePosition,
}: {
  teamName: string;
  team: Team;
  allTopLevelPositions: Position[];
  teamPositions: Record<string, string[]>;
  onTogglePosition: (teamName: string, posName: string) => void;
}) => {
  const { t } = useTranslation();
  const selectedPositions = teamPositions[teamName] || [];

  return (
    <SortableItem value={teamName} label={`${team.emoji} ${team.name}`}>
      {allTopLevelPositions.length > 0 ? (
        <SearchableMultiPicker
          items={allTopLevelPositions.map((pos) => ({
            id: pos.id,
            label: pos.name,
            emoji: pos.emoji,
            color: pos.colour,
          }))}
          selectedIds={selectedPositions}
          onToggle={(posId) => onTogglePosition(teamName, posId)}
          placeholder={t("settings.searchPositions", {
            defaultValue: "Search positions...",
          })}
        />
      ) : (
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--color-text-dim)",
            margin: 0,
            fontStyle: "italic",
          }}
        >
          {t("management.user.noPositions", {
            defaultValue: "No assignable positions for this team.",
          })}
        </p>
      )}
    </SortableItem>
  );
};

const TeamPositionEditor = ({
  selectedTeams,
  teamPositions,
  onToggleTeam,
  onTogglePosition,
  onReorderTeams,
  availableTeams,
  globalPositions,
}: TeamPositionEditorProps) => {
  const { t } = useTranslation();
  return (
    <>
      <div className={commonStyles.formGroup}>
        <label className={commonStyles.sectionLabel}>
          {t("management.user.teams")}
        </label>
        <SearchableMultiPicker
          items={availableTeams.map((team) => ({
            id: team.id,
            label: team.name,
            emoji: team.emoji,
          }))}
          selectedIds={selectedTeams}
          onToggle={onToggleTeam}
          placeholder={t("settings.searchTeams", {
            defaultValue: "Search teams...",
          })}
        />
      </div>

      {selectedTeams.length > 0 && (
        <div className={commonStyles.formGroup}>
          <label className={commonStyles.sectionLabel}>
            {t("management.user.positionsPerTeam")}
          </label>
          <SortableList
            items={selectedTeams}
            onReorder={onReorderTeams || (() => {})}
          >
            {selectedTeams.map((teamId) => {
              const team = availableTeams.find(
                (t) => t.id === teamId || t.name === teamId,
              );
              if (!team) return null;

              const allTopLevelPositions = (team.positions || [])
                .map((id) =>
                  globalPositions.find((gp) => gp.id === id || gp.name === id),
                )
                .filter((p): p is Position => !!p && !p.parentId);

              return (
                <ReorderableTeamItem
                  key={teamId}
                  teamName={teamId}
                  team={team}
                  allTopLevelPositions={allTopLevelPositions}
                  teamPositions={teamPositions}
                  onTogglePosition={onTogglePosition}
                />
              );
            })}
          </SortableList>
        </div>
      )}
    </>
  );
};

export default TeamPositionEditor;
