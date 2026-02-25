import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";

import Pill from "../../components/common/Pill";
import { Position, Team } from "../../model/model";
import commonStyles from "../../styles/settings-common.module.css";

interface TeamPositionEditorProps {
  selectedTeams: string[];
  teamPositions: Record<string, string[]>;
  onToggleTeam: (teamName: string) => void;
  onTogglePosition: (teamName: string, posName: string) => void;
  onReorderTeams?: (newOrder: string[]) => void;
  onReorderPositions?: (teamName: string, newOrder: string[]) => void;
  availableTeams: Team[];
  globalPositions: Position[];
}

const ReorderablePositionPill = ({
  teamName,
  posName,
  pos,
  isSelected,
  isCustom,
  onTogglePosition,
}: {
  teamName: string;
  posName: string;
  pos: Position | undefined;
  isSelected: boolean;
  isCustom: boolean;
  onTogglePosition: (teamName: string, posName: string) => void;
}) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={posName}
      dragListener={false}
      dragControls={dragControls}
      style={{ listStyle: "none", padding: 0, margin: 0 }}
    >
      <Pill
        onClick={() => onTogglePosition(teamName, posName)}
        isActive={isSelected}
        isDisabled={isCustom}
        colour={pos?.colour}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {isSelected && (
            <div
              style={{ cursor: "grab", touchAction: "none" }}
              onPointerDown={(e) => dragControls.start(e)}
            >
              <GripVertical size={14} style={{ opacity: 0.5 }} />
            </div>
          )}
          <span>{pos?.emoji}</span> {posName}
        </div>
      </Pill>
    </Reorder.Item>
  );
};

const ReorderableTeamItem = ({
  teamName,
  team,
  allTopLevelPositions,
  globalPositions,
  teamPositions,
  onTogglePosition,
  onReorderPositions,
}: {
  teamName: string;
  team: Team;
  allTopLevelPositions: Position[];
  globalPositions: Position[];
  teamPositions: Record<string, string[]>;
  onTogglePosition: (teamName: string, posName: string) => void;
  onReorderPositions?: (teamName: string, newOrder: string[]) => void;
}) => {
  const dragControls = useDragControls();
  const selectedInOrder = teamPositions[teamName] || [];

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
        <Reorder.Group
          axis="x"
          values={selectedInOrder}
          onReorder={(newOrder) => onReorderPositions?.(teamName, newOrder)}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            padding: 0,
            margin: 0,
            listStyle: "none",
          }}
        >
          {/* Render selected positions first (draggable) */}
          {selectedInOrder.map((posName) => {
            const gp = globalPositions.find((p) => p.name === posName);
            return (
              <ReorderablePositionPill
                key={posName}
                teamName={teamName}
                posName={posName}
                pos={gp}
                isSelected={true}
                isCustom={!!gp?.isCustom}
                onTogglePosition={onTogglePosition}
              />
            );
          })}
          {/* Render unselected positions (not draggable) */}
          {allTopLevelPositions
            .filter((pos) => !selectedInOrder.includes(pos.name))
            .map((pos) => {
              const gp = globalPositions.find((p) => p.name === pos.name);
              return (
                <Pill
                  key={pos.name}
                  onClick={() => onTogglePosition(teamName, pos.name)}
                  isActive={false}
                  isDisabled={!!gp?.isCustom}
                  colour={pos.colour}
                >
                  <span>{pos.emoji}</span> {pos.name}
                </Pill>
              );
            })}
        </Reorder.Group>
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
  onReorderPositions,
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
            style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "16px" }}
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
                  onReorderPositions={onReorderPositions}
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
