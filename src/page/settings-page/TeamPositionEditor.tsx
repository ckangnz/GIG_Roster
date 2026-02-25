import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";

import Pill, { PillGroup } from "../../components/common/Pill";
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
  globalPositions,
  teamPositions,
  onTogglePosition,
}: {
  teamName: string;
  team: Team;
  allTopLevelPositions: Position[];
  globalPositions: Position[];
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
      className={commonStyles.subSectionGroup}
      style={{ listStyle: "none", padding: 0, margin: 0 }}
    >
      <div
        className={commonStyles.subSectionHeader}
        style={{ justifyContent: "space-between" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{ cursor: "grab", touchAction: "none" }}
            onPointerDown={(e) => dragControls.start(e)}
          >
            <GripVertical size={18} style={{ opacity: 0.4 }} />
          </div>
          {team.emoji} {team.name}
        </div>
      </div>
      {allTopLevelPositions.length > 0 ? (
        <PillGroup>
          {allTopLevelPositions.map((pos) => {
            const gp = globalPositions.find((p) => p.name === pos.name);
            const isCustom = !!gp?.isCustom;
            const isSelected = selectedPositions.includes(pos.name);
            return (
              <Pill
                key={pos.name}
                onClick={() => onTogglePosition(teamName, pos.name)}
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
            margin: "8px 0",
          }}
        >
          No assignable positions for this team.
        </p>
      )}
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
            const isSelected = selectedTeams.includes(team.name);
            return (
              <Pill
                key={team.name}
                onClick={() => onToggleTeam(team.name)}
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
              gap: "16px" 
            }}
          >
            {selectedTeams.map((teamName) => {
              const team = availableTeams.find((t) => t.name === teamName);
              if (!team) return null;

              const allTopLevelPositions =
                team.positions?.filter((pos) => !pos.parentId) || [];

              return (
                <ReorderableTeamItem
                  key={teamName}
                  teamName={teamName}
                  team={team}
                  allTopLevelPositions={allTopLevelPositions}
                  globalPositions={globalPositions}
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
