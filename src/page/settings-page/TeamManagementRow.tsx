import { Reorder, useDragControls } from "framer-motion";
import { Trash2, GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "../../components/common/Button";
import {
  SettingsTableAnyCell,
} from "../../components/common/SettingsTable";
import SummaryCell from "../../components/common/SummaryCell";
import { Position, Team } from "../../model/model";
import formStyles from "../../styles/form.module.css";
import styles from "../../styles/settings-common.module.css";

interface TeamManagementRowProps {
  team: Team;
  teamIndex: number;
  availablePositions: Position[];
  onUpdate: (index: number, field: keyof Team, value: Team[keyof Team]) => void;
  onDelete: (index: number) => void;
  onEdit: (index: number) => void;
}

const TeamManagementRow = ({
  team,
  teamIndex,
  availablePositions,
  onUpdate,
  onDelete,
  onEdit,
}: TeamManagementRowProps) => {
  const { t } = useTranslation();
  const dragControls = useDragControls();

  const getPositionsSummary = () => {
    if (!team.positions || team.positions.length === 0) {
      return t('common.none');
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
      return t('common.none');
    return team.preferredDays.map((d) => t(`common.weekdays.${d.toLowerCase().substring(0, 3)}`)).join(", ");
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
              className={`${formStyles.formInput} ${!team.name?.trim() ? formStyles.inputError : ""}`}
              value={team.name}
              onChange={(e) => onUpdate(teamIndex, "name", e.target.value)}
              style={{ width: "100%" }}
              title={!team.name?.trim() ? t('management.team.nameRequired') : ""}
            />
          </div>
        </SettingsTableAnyCell>
        <SettingsTableAnyCell>
          <input
            name={`team-emoji-${teamIndex}`}
            className={`${formStyles.formInput} ${!team.emoji?.trim() ? formStyles.inputError : ""}`}
            value={team.emoji}
            onChange={(e) => onUpdate(teamIndex, "emoji", e.target.value)}
          />
        </SettingsTableAnyCell>
        <SettingsTableAnyCell>
          <input
            name={`team-maxConflict-${teamIndex}`}
            className={`${formStyles.formInput} ${(!team.maxConflict || team.maxConflict < 1) ? formStyles.inputError : ""}`}
            value={team.maxConflict?.toString() || "1"}
            type="number"
            title={t('management.team.maxConflictHint', { defaultValue: 'Maximum number of simultaneous positions a member can be assigned to within this team.' })}
            onChange={(e) =>
              onUpdate(teamIndex, "maxConflict", parseInt(e.target.value) || 1)
            }
          />
        </SettingsTableAnyCell>
        <SettingsTableAnyCell>
          <SummaryCell
            primaryText={getPositionsSummary()}
            secondaryText={getDaysSummary()}
            onClick={() => onEdit(teamIndex)}
          />
        </SettingsTableAnyCell>
        <SettingsTableAnyCell>
          <Button
            variant="delete"
            size="small"
            onClick={() => onDelete(teamIndex)}
          >
            <Trash2 size={14} style={{ marginRight: "6px" }} />
            {t('common.delete')}
          </Button>
        </SettingsTableAnyCell>
      </Reorder.Item>
    </>
  );
};

export default TeamManagementRow;
