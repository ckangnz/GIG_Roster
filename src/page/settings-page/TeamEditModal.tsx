import Modal from "../../components/common/Modal";
import Pill, { PillGroup } from "../../components/common/Pill";
import { Position, Team, Weekday } from "../../model/model";
import styles from "../../styles/settings-common.module.css";

interface TeamEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  availablePositions: Position[];
  onTogglePosition: (pos: Position) => void;
  onToggleDay: (day: Weekday) => void;
}

const WEEK_DAYS: Weekday[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TeamEditModal = ({ 
  isOpen, 
  onClose, 
  team, 
  availablePositions, 
  onTogglePosition, 
  onToggleDay 
}: TeamEditModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Team: ${team.name}`}>
      <div className={styles.formGroup}>
        <label className={styles.sectionLabel}>Allowed Positions</label>
        <PillGroup>
          {availablePositions
            ?.filter((pos) => !pos.parentId)
            ?.map((pos) => {
              const isActive = team.positions?.some((p) => p.name === pos.name);
              return (
                <Pill
                  key={pos.name}
                  colour={pos.colour}
                  isActive={isActive}
                  onClick={() => onTogglePosition(pos)}
                >
                  {pos.emoji} {pos.name}
                </Pill>
              );
            })}
        </PillGroup>
      </div>

      <div className={styles.settingsSection}>
        <label className={styles.sectionLabel}>Preferred Days</label>
        <PillGroup>
          {WEEK_DAYS.map((day) => {
            const isActive = team.preferredDays?.includes(day);
            return (
              <Pill
                key={day}
                isActive={isActive}
                onClick={() => onToggleDay(day)}
              >
                {day}
              </Pill>
            );
          })}
        </PillGroup>
      </div>
    </Modal>
  );
};

export default TeamEditModal;
