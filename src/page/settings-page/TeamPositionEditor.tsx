import Button from "../../components/common/Button";
import Pill, { PillGroup } from "../../components/common/Pill";
import { Position, Team } from "../../model/model";
import commonStyles from "../../styles/settings-common.module.css";

interface TeamPositionEditorProps {
  selectedTeams: string[];
  teamPositions: Record<string, string[]>;
  onToggleTeam: (teamName: string) => void;
  onTogglePosition: (teamName: string, posName: string) => void;
  onMoveTeam?: (teamName: string, direction: "up" | "down") => void;
  availableTeams: Team[];
  globalPositions: Position[];
}

const TeamPositionEditor = ({
  selectedTeams,
  teamPositions,
  onToggleTeam,
  onTogglePosition,
  onMoveTeam,
  availableTeams,
  globalPositions,
}: TeamPositionEditorProps) => {
  return (
    <>
      <div className={commonStyles.formGroup}>
        <label className={commonStyles.sectionLabel}>Teams</label>
        <PillGroup>
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
        </PillGroup>
      </div>

      {selectedTeams.length > 0 && (
        <div className={commonStyles.settingsSection}>
          <label className={commonStyles.sectionLabel}>Positions per Team</label>
          {selectedTeams.map((teamName, index) => {
            const team = availableTeams.find((t) => t.name === teamName);
            if (!team) return null;

            const allTopLevelPositions =
              team.positions?.filter((pos) => !pos.parentId) || [];

            return (
              <div key={teamName} className={commonStyles.subSectionGroup}>
                <div
                  className={commonStyles.subSectionHeader}
                  style={{ justifyContent: "space-between" }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    {team.emoji} {team.name}
                  </div>
                  {onMoveTeam && (
                    <div style={{ display: "flex", gap: "4px" }}>
                      <Button
                        variant="secondary"
                        size="small"
                        isIcon
                        onClick={() => onMoveTeam(teamName, "up")}
                        disabled={index === 0}
                      >
                        ▲
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        isIcon
                        onClick={() => onMoveTeam(teamName, "down")}
                        disabled={index === selectedTeams.length - 1}
                      >
                        ▼
                      </Button>
                    </div>
                  )}
                </div>
                {allTopLevelPositions.length > 0 ? (
                  <PillGroup>
                    {allTopLevelPositions.map((pos) => {
                      const gp = globalPositions.find(
                        (p) => p.name === pos.name,
                      );
                      const isCustom = !!gp?.isCustom;
                      const isSelected =
                        teamPositions[teamName]?.includes(pos.name);
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
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default TeamPositionEditor;
