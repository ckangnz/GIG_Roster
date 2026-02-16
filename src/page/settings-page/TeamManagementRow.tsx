import { useState } from "react";

import { Trash2 } from "lucide-react";

import TeamEditModal from "./TeamEditModal";
import Button from "../../components/common/Button";
import {
  SettingsTableAnyCell,
  SettingsTableInputCell,
} from "../../components/common/SettingsTable";
import SummaryCell from "../../components/common/SummaryCell";
import { Position, Team, Weekday } from "../../model/model";

interface TeamManagementRowProps {
  team: Team;
  teamIndex: number;
  availablePositions: Position[];
  onUpdate: (index: number, field: keyof Team, value: Team[keyof Team]) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  onDelete: (index: number) => void;
  onTogglePosition: (teamIndex: number, pos: Position) => void;
  onToggleDay: (teamIndex: number, day: Weekday) => void;
  onToggleAllowAbsence: (teamIndex: number, allow: boolean) => void;
  isFirst: boolean;
  isLast: boolean;
}

const TeamManagementRow = ({
  team,
  teamIndex,
  availablePositions,
  onUpdate,
  onMove,
  onDelete,
  onTogglePosition,
  onToggleDay,
  onToggleAllowAbsence,
  isFirst,
  isLast,
}: TeamManagementRowProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getPositionsSummary = () => {
    if (!team.positions || team.positions.length === 0) return "No positions";
    return team.positions.map((p) => p.emoji).join(" ");
  };

  const getDaysSummary = () => {
    if (!team.preferredDays || team.preferredDays.length === 0)
      return "No days";
    return team.preferredDays.map((d) => d.substring(0, 3)).join(", ");
  };

  return (
    <>
      <tr>
        <SettingsTableInputCell
          name={`team-name-${teamIndex}`}
          value={team.name}
          onChange={(e) => onUpdate(teamIndex, "name", e.target.value)}
          isSticky
        />
        <SettingsTableAnyCell>
          <div
            style={{ display: "flex", gap: "4px", justifyContent: "center" }}
          >
            <Button
              variant="secondary"
              size="small"
              isIcon
              onClick={() => onMove(teamIndex, "up")}
              disabled={isFirst}
            >
              ▲
            </Button>
            <Button
              variant="secondary"
              size="small"
              isIcon
              onClick={() => onMove(teamIndex, "down")}
              disabled={isLast}
            >
              ▼
            </Button>
          </div>
        </SettingsTableAnyCell>
        <SettingsTableInputCell
          name={`team-emoji-${teamIndex}`}
          value={team.emoji}
          onChange={(e) => onUpdate(teamIndex, "emoji", e.target.value)}
        />
        <SettingsTableInputCell
          name={`team-maxConflict-${teamIndex}`}
          value={team.maxConflict?.toString() || "1"}
          type="number"
          onChange={(e) =>
            onUpdate(teamIndex, "maxConflict", parseInt(e.target.value) || 1)
          }
        />
        <SettingsTableAnyCell>
          <SummaryCell
            primaryText={getPositionsSummary()}
            secondaryText={getDaysSummary()}
            onClick={() => setIsModalOpen(true)}
          />
        </SettingsTableAnyCell>
        <SettingsTableAnyCell>
          <Button
            variant="delete"
            size="small"
            onClick={() => onDelete(teamIndex)}
          >
            <Trash2 size={14} style={{ marginRight: "6px" }} />
            Delete
          </Button>
        </SettingsTableAnyCell>
      </tr>

      <TeamEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        team={team}
        availablePositions={availablePositions}
        onTogglePosition={(pos) => onTogglePosition(teamIndex, pos)}
        onToggleDay={(day) => onToggleDay(teamIndex, day)}
        onToggleAllowAbsence={(allow) => onToggleAllowAbsence(teamIndex, allow)}
      />
    </>
  );
};

export default TeamManagementRow;
