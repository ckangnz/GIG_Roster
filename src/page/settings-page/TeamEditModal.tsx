import { Plus, Trash2 } from "lucide-react";

import Modal from "../../components/common/Modal";
import Pill, { PillGroup } from "../../components/common/Pill";
import { Position, RecurringEvent, Team, Weekday } from "../../model/model";
import styles from "../../styles/settings-common.module.css";

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
      offsetDays: 0,
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

      <div className={styles.formGroup}>
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

      <div className={styles.formGroup}>
        <label className={styles.sectionLabel}>Feature Settings</label>
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

      <div className={styles.formGroup}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <label className={styles.sectionLabel}>Recurring Events</label>
          <button
            className={styles.addEventBtn}
            onClick={handleAddEvent}
            title="Add event"
            style={{
              background: "none",
              border: "none",
              color: "var(--color-link)",
              cursor: "pointer",
            }}
          >
            <Plus size={18} />
          </button>
        </div>

        <div className={styles.eventList}>
          {(team.recurringEvents || []).map((ev) => (
            <div
              key={ev.id}
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                marginBottom: "8px",
                flexWrap: "wrap",
                padding: "8px",
                borderRadius: "8px",
                backgroundColor: "var(--background-secondary)",
              }}
            >
              <input
                type="text"
                value={ev.label}
                placeholder="Nickname (e.g. Practice)"
                onChange={(e) =>
                  handleUpdateEvent(ev.id, "label", e.target.value)
                }
                style={{
                  flex: "1 1 120px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color-input)",
                  fontSize: "0.85rem",
                }}
              />
              <select
                value={ev.day}
                onChange={(e) =>
                  handleUpdateEvent(ev.id, "day", e.target.value as Weekday)
                }
                style={{
                  padding: "4px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color-input)",
                  fontSize: "0.85rem",
                }}
              >
                {WEEK_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={ev.startTime}
                onChange={(e) =>
                  handleUpdateEvent(ev.id, "startTime", e.target.value)
                }
                style={{
                  padding: "4px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color-input)",
                  fontSize: "0.85rem",
                }}
              />
              <input
                type="time"
                value={ev.endTime}
                onChange={(e) =>
                  handleUpdateEvent(ev.id, "endTime", e.target.value)
                }
                style={{
                  padding: "4px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color-input)",
                  fontSize: "0.85rem",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-dim)" }}>
                  Offset:
                </span>
                <input
                  type="number"
                  value={ev.offsetDays}
                  onChange={(e) =>
                    handleUpdateEvent(ev.id, "offsetDays", parseInt(e.target.value) || 0)
                  }
                  style={{
                    width: "45px",
                    padding: "4px",
                    borderRadius: "4px",
                    border: "1px solid var(--border-color-input)",
                    fontSize: "0.85rem",
                  }}
                  title="Days relative to rostered date (-ve for before, 0 for same day)"
                />
              </div>
              <button
                onClick={() => handleRemoveEvent(ev.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-error)",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={16} />
              </button>
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
              No recurring events configured.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TeamEditModal;
