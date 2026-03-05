import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

import SearchableMultiPicker from "../../components/common/SearchableMultiPicker";
import { SettingsGroup } from "../../components/common/SettingsGroup";
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
  const dragControls = useDragControls();
  const selectedPositions = teamPositions[teamName] || [];

  return (
    <Reorder.Item
      value={teamName}
      dragListener={false}
      dragControls={dragControls}
      style={{ listStyle: "none", padding: 0, margin: 0 }}
    >
      <SettingsGroup>
        <div
          style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: allTopLevelPositions.length > 0 ? "8px" : 0
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{ cursor: "grab", touchAction: "none", opacity: 0.4 }}
              onPointerDown={(e) => dragControls.start(e)}
            >
              <GripVertical size={18} />
            </div>
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
              {team.emoji} {team.name}
            </span>
          </div>
        </div>

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
            placeholder={t("settings.searchPositions", { defaultValue: "Search positions..." })}
          />
        ) : (
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--color-text-dim)",
              margin: 0,
              fontStyle: "italic"
            }}
          >
            {t('management.user.noPositions', { defaultValue: 'No assignable positions for this team.' })}
          </p>
        )}
      </SettingsGroup>
    </Reorder.Item>
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
        <label className={commonStyles.sectionLabel}>{t('management.user.teams')}</label>
        <SearchableMultiPicker
          items={availableTeams.map((team) => ({
            id: team.id,
            label: team.name,
            emoji: team.emoji,
          }))}
          selectedIds={selectedTeams}
          onToggle={onToggleTeam}
          placeholder={t("settings.searchTeams", { defaultValue: "Search teams..." })}
        />
      </div>

      {selectedTeams.length > 0 && (
        <div className={commonStyles.formGroup}>
          <label className={commonStyles.sectionLabel}>
            {t('management.user.positionsPerTeam')}
          </label>
          <Reorder.Group
            axis="y"
            values={selectedTeams}
            onReorder={onReorderTeams || (() => {})}
            style={{ 
              listStyle: "none", 
              padding: 0, 
              margin: 0, 
              display: "flex", 
              flexDirection: "column", 
              gap: "12px" 
            }}
          >
            {selectedTeams.map((teamId) => {
              const team = availableTeams.find((t) => t.id === teamId || t.name === teamId);
              if (!team) return null;

              const allTopLevelPositions = (team.positions || [])
                .map(id => globalPositions.find(gp => gp.id === id || gp.name === id))
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
          </Reorder.Group>
        </div>
      )}
    </>
  );
};

export default TeamPositionEditor;
