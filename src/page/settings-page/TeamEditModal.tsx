import { Plus, Trash2 } from "lucide-react";

import Button from "../../components/common/Button";
import { InputField, SelectField } from "../../components/common/InputField";
import Modal from "../../components/common/Modal";
import Pill, { PillGroup } from "../../components/common/Pill";
import { Position, RecurringEvent, Team, Weekday } from "../../model/model";
import commonStyles from "../../styles/settings-common.module.css";

import localStyles from "./team-edit-modal.module.css";

interface TeamEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  availablePositions: Position[];
  onTogglePosition: (pos: Position) => void;
  onToggleDay: (day: Weekday) => void;
  onToggleAllowAbsence: (allow: boolean) => void;
  onUpdateEvents: (events: RecurringEvent[]) => void;
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
  onToggleDay,
  onToggleAllowAbsence,
  onUpdateEvents,
}: TeamEditModalProps) => {
  const handleAddEvent = () => {
    const newEvent: RecurringEvent = {
      id: Math.random().toString(36).substring(2, 10),
      label: "",
      day: "Sunday",
      startTime: "09:00",
      endTime: "10:30",
    };
    onUpdateEvents([...(team.recurringEvents || []), newEvent]);
  };

  const handleUpdateEvent = (
    id: string,
    field: keyof RecurringEvent,
    value: string | number,
  ) => {
    const updated = (team.recurringEvents || []).map((ev) =>
      ev.id === id ? { ...ev, [field]: value } : ev,
    );
    onUpdateEvents(updated);
  };

  const handleRemoveEvent = (id: string) => {
    const updated = (team.recurringEvents || []).filter((ev) => ev.id !== id);
    onUpdateEvents(updated);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Team: ${team.name}`}>
      <div className={commonStyles.formGroup}>
        <label className={commonStyles.sectionLabel}>Allowed Positions</label>
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

      <div className={commonStyles.formGroup}>
        <label className={commonStyles.sectionLabel}>Preferred Days</label>
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

      <div className={localStyles.recurringEventsSection}>
        <div className={localStyles.sectionHeader}>
          <label className={commonStyles.sectionLabel}>Calendar Setup</label>
          <Button
            variant="secondary"
            size="small"
            isIcon
            onClick={handleAddEvent}
            title="Add event"
          >
            <Plus size={18} />
          </Button>
        </div>

        <div className={localStyles.eventList}>
          {(team.recurringEvents || []).map((ev) => (
            <div key={ev.id} className={localStyles.eventItem}>
              <div className={localStyles.eventInputLabel}>
                <InputField
                  label="Event Name"
                  value={ev.label}
                  placeholder="e.g. Practice"
                  onChange={(e) =>
                    handleUpdateEvent(ev.id, "label", e.target.value)
                  }
                />
              </div>
              <div className={localStyles.eventInputDay}>
                <SelectField
                  label="Week Day"
                  value={ev.day}
                  onChange={(e) =>
                    handleUpdateEvent(ev.id, "day", e.target.value as Weekday)
                  }
                >
                  {WEEK_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className={localStyles.eventInputTime}>
                <InputField
                  label="Starts"
                  type="time"
                  value={ev.startTime}
                  onChange={(e) =>
                    handleUpdateEvent(ev.id, "startTime", e.target.value)
                  }
                />
              </div>
              <div className={localStyles.eventInputTime}>
                <InputField
                  label="Finishes"
                  type="time"
                  value={ev.endTime}
                  onChange={(e) =>
                    handleUpdateEvent(ev.id, "endTime", e.target.value)
                  }
                />
              </div>
              <Button
                variant="delete"
                size="small"
                isIcon
                className={localStyles.deleteBtn}
                onClick={() => handleRemoveEvent(ev.id)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          {(!team.recurringEvents || team.recurringEvents.length === 0) && (
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--color-text-dim)",
                fontStyle: "italic",
              }}
            >
              No calendar events configured.
            </p>
          )}
        </div>
      </div>

      <div className={localStyles.absenceSection}>
        <label className={commonStyles.sectionLabel}>Absence</label>
        <PillGroup>
          <Pill
            isActive={team.allowAbsence !== false}
            onClick={() => onToggleAllowAbsence(team.allowAbsence === false)}
            colour={
              team.allowAbsence !== false
                ? "var(--color-success-dark)"
                : "var(--color-text-dim)"
            }
          >
            Allow Absence: {team.allowAbsence !== false ? "YES" : "NO"}
          </Pill>
        </PillGroup>
      </div>
    </Modal>
  );
};

export default TeamEditModal;
