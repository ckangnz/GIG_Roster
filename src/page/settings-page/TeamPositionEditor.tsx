import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";

import Pill, { PillGroup } from "../../components/common/Pill";
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
          <PillGroup>
            {allTopLevelPositions.map((pos) => {
              const isCustom = !!pos.isCustom;
              const isSelected = selectedPositions.includes(pos.id) || selectedPositions.includes(pos.name);
              return (
                <Pill
                  key={pos.id}
                  onClick={() => onTogglePosition(teamName, pos.id)}
                  isActive={isSelected}
                  isDisabled={isCustom}
                  colour={pos.colour}
                >
                  <span>{pos.emoji}</span> {pos.name}
                </Pill>
              );
            })}
          </PillGroup>
        ) : (
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--color-text-dim)",
              margin: 0,
              fontStyle: "italic"
            }}
          >
            No assignable positions for this team.
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
  return (
    <>
      <div className={commonStyles.formGroup}>
        <label className={commonStyles.sectionLabel}>Teams</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {availableTeams.map((team) => {
            const teamIdentifier = team.id;
            const isSelected = selectedTeams.includes(teamIdentifier);
            return (
              <Pill
                key={teamIdentifier}
                onClick={() => onToggleTeam(teamIdentifier)}
                isActive={isSelected}
              >
                <span>{team.emoji}</span> {team.name}
              </Pill>
            );
          })}
        </div>
      </div>

      {selectedTeams.length > 0 && (
        <div className={commonStyles.settingsSection}>
          <label className={commonStyles.sectionLabel}>
            Positions per Team
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
