import { Reorder, useDragControls } from "framer-motion";
import { Plus, Trash2, GripVertical } from "lucide-react";

import Button from "../../components/common/Button";
import { InputField, SelectField } from "../../components/common/InputField";
import Modal from "../../components/common/Modal";
import Pill, { PillGroup } from "../../components/common/Pill";
import Toggle from "../../components/common/Toggle";
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
  onUpdateDayEndTime: (day: Weekday, time: string) => void;
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

const EventItem = ({
  ev,
  onUpdate,
  onRemove,
}: {
  ev: RecurringEvent;
  onUpdate: (id: string, field: keyof RecurringEvent, value: string | number) => void;
  onRemove: (id: string) => void;
}) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={ev}
      dragListener={false}
      dragControls={dragControls}
      className={localStyles.eventItem}
    >
      <div
        className={localStyles.dragHandle}
        onPointerDown={(e) => dragControls.start(e)}
      >
        <GripVertical size={20} />
      </div>

      <div className={localStyles.eventInputLabel}>
        <InputField
          label="Event Name"
          value={ev.label}
          placeholder="e.g. Practice"
          onChange={(e) => onUpdate(ev.id, "label", e.target.value)}
        />
      </div>
      <div className={localStyles.eventInputDay}>
        <SelectField
          label="Week Day"
          value={ev.day}
          onChange={(e) =>
            onUpdate(ev.id, "day", e.target.value as Weekday)
          }
        >
          {WEEK_DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </SelectField>
      </div>
      <div className={localStyles.eventInputStart}>
        <InputField
          label="Starts"
          type="time"
          value={ev.startTime}
          onChange={(e) => onUpdate(ev.id, "startTime", e.target.value)}
        />
      </div>
      <div className={localStyles.eventInputEnd}>
        <InputField
          label="Finishes"
          type="time"
          value={ev.endTime}
          onChange={(e) => onUpdate(ev.id, "endTime", e.target.value)}
        />
      </div>
      <Button
        variant="delete"
        size="small"
        isIcon
        className={localStyles.deleteBtn}
        onClick={() => onRemove(ev.id)}
      >
        <Trash2 size={16} />
      </Button>
    </Reorder.Item>
  );
};

const TeamEditModal = ({
  isOpen,
  onClose,
  team,
  availablePositions,
  onTogglePosition,
  onToggleDay,
  onToggleAllowAbsence,
  onUpdateEvents,
  onUpdateDayEndTime,
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

  const handleReorderEvents = (newOrder: RecurringEvent[]) => {
    onUpdateEvents(newOrder);
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
        <label className={commonStyles.sectionLabel}>Preferred Days & End Times</label>
        <div className={localStyles.preferredDaysGrid}>
          {WEEK_DAYS.map((day) => {
            const isActive = team.preferredDays?.includes(day);
            return (
              <div
                key={day}
                className={`${localStyles.preferredDayItem} ${isActive ? localStyles.preferredDayItemActive : ""}`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span className={localStyles.dayLabel}>{day}</span>
                  <Toggle
                    isOn={isActive}
                    onToggle={() => onToggleDay(day)}
                  />
                </div>
                {isActive && (
                  <InputField
                    type="time"
                    label="End Time"
                    value={team.dayEndTimes?.[day] || ""}
                    onChange={(e) => onUpdateDayEndTime(day, e.target.value)}
                    style={{ width: "100%" }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--color-text-dim)", marginTop: "12px", opacity: 0.8 }}>
          * Setting an end time automatically moves today's roster to history after that time.
        </p>
      </div>

      <div className={localStyles.recurringEventsSection}>
        <div className={localStyles.sectionHeader}>
          <label className={commonStyles.sectionLabel}>Calendar Setup</label>
          <Button
            variant="primary"
            size="small"
            onClick={handleAddEvent}
          >
            <Plus size={16} style={{ marginRight: "6px" }} />
            Add Event
          </Button>
        </div>

        <Reorder.Group
          axis="y"
          values={team.recurringEvents || []}
          onReorder={handleReorderEvents}
          className={localStyles.eventList}
          style={{ listStyle: "none", padding: 0, margin: 0 }}
        >
          {(team.recurringEvents || []).map((ev) => (
            <EventItem
              key={ev.id}
              ev={ev}
              onUpdate={handleUpdateEvent}
              onRemove={handleRemoveEvent}
            />
          ))}
        </Reorder.Group>

        {(!team.recurringEvents || team.recurringEvents.length === 0) && (
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--color-text-dim)",
              fontStyle: "italic",
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            No calendar events configured.
          </p>
        )}
      </div>

      <div className={localStyles.absenceSection}>
        <label className={commonStyles.sectionLabel}>Absence Settings</label>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "0.95rem", color: "var(--color-text-secondary)" }}>
            Allow Absence
          </span>
          <Toggle
            isOn={team.allowAbsence !== false}
            onToggle={(isOn) => onToggleAllowAbsence(isOn)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default TeamEditModal;
