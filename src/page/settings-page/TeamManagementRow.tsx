import { useState } from "react";

import { Reorder, useDragControls } from "framer-motion";
import { Trash2, GripVertical } from "lucide-react";

import TeamEditModal from "./TeamEditModal";
import Button from "../../components/common/Button";
import {
  SettingsTableAnyCell,
} from "../../components/common/SettingsTable";
import SummaryCell from "../../components/common/SummaryCell";
import { Position, RecurringEvent, Team, Weekday } from "../../model/model";
import formStyles from "../../styles/form.module.css";
import styles from "../../styles/settings-common.module.css";

interface TeamManagementRowProps {
  team: Team;
  teamIndex: number;
  availablePositions: Position[];
  onUpdate: (index: number, field: keyof Team, value: Team[keyof Team]) => void;
  onDelete: (index: number) => void;
  onTogglePosition: (teamIndex: number, pos: Position) => void;
  onToggleDay: (teamIndex: number, day: Weekday) => void;
  onToggleAllowAbsence: (teamIndex: number, allow: boolean) => void;
  onUpdateEvents: (teamIndex: number, events: RecurringEvent[]) => void;
  onUpdateDayEndTime: (teamIndex: number, day: Weekday, time: string) => void;
  onUpdateField: (field: keyof Team, value: Team[keyof Team]) => void;
}

const TeamManagementRow = ({
  team,
  teamIndex,
  availablePositions,
  onUpdate,
  onDelete,
  onTogglePosition,
  onToggleDay,
  onToggleAllowAbsence,
  onUpdateEvents,
  onUpdateDayEndTime,
  onUpdateField,
}: TeamManagementRowProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dragControls = useDragControls();

  const getPositionsSummary = () => {
    if (!team.positions || team.positions.length === 0) {
      return "No positions";
    }

    const displayEmojis = (team.positions || [])
      .slice(0, 3)
      .map((posId) => {
        const pos = availablePositions.find(ap => ap.id === posId);
        return (
          <span key={posId} className={styles.summaryEmoji}>
            {pos?.emoji || "❓"}
          </span>
        );
      });
    const remainingCount = team.positions.length - 3;

    return (
      <>
        {displayEmojis}
        {remainingCount > 0 && (
          <span className={styles.remainingCount}>+{remainingCount}</span>
        )}
      </>
    );
  };

  const getDaysSummary = () => {
    if (!team.preferredDays || team.preferredDays.length === 0)
      return "No days";
    return team.preferredDays.map((d) => d.substring(0, 3)).join(", ");
  };

  return (
    <>
      <Reorder.Item
        value={team}
        dragListener={false}
        dragControls={dragControls}
        as="tr"
        style={{ background: "var(--background-card)" }}
      >
        <SettingsTableAnyCell isSticky>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
            }}
          >
            <div
              style={{
                cursor: "grab",
                display: "flex",
                alignItems: "center",
                touchAction: "none",
              }}
              onPointerDown={(e) => dragControls.start(e)}
            >
              <GripVertical size={20} style={{ opacity: 0.4 }} />
            </div>
            <input
              name={`team-name-${teamIndex}`}
              className={formStyles.formInput}
              value={team.name}
              onChange={(e) => onUpdate(teamIndex, "name", e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </SettingsTableAnyCell>
        <SettingsTableAnyCell>
          <input
            name={`team-emoji-${teamIndex}`}
            className={formStyles.formInput}
            value={team.emoji}
            onChange={(e) => onUpdate(teamIndex, "emoji", e.target.value)}
          />
        </SettingsTableAnyCell>
        <SettingsTableAnyCell>
          <input
            name={`team-maxConflict-${teamIndex}`}
            className={formStyles.formInput}
            value={team.maxConflict?.toString() || "1"}
            type="number"
            title="Maximum number of simultaneous positions a member can be assigned to within this team."
            onChange={(e) =>
              onUpdate(teamIndex, "maxConflict", parseInt(e.target.value) || 1)
            }
          />
        </SettingsTableAnyCell>
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
      </Reorder.Item>

      <TeamEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        team={team}
        availablePositions={availablePositions}
        onTogglePosition={(pos) => onTogglePosition(teamIndex, pos)}
        onToggleDay={(day) => onToggleDay(teamIndex, day)}
        onToggleAllowAbsence={(allow) => onToggleAllowAbsence(teamIndex, allow)}
        onUpdateEvents={(events) => onUpdateEvents(teamIndex, events)}
        onUpdateDayEndTime={(day, time) =>
          onUpdateDayEndTime(teamIndex, day, time)
        }
        onUpdateField={onUpdateField}
      />
    </>
  );
};

export default TeamManagementRow;
