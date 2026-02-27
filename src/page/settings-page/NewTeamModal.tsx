import { useState } from "react";

import { Reorder, useDragControls } from "framer-motion";
import { Plus, Trash2, GripVertical } from "lucide-react";

import Button from "../../components/common/Button";
import { InputField, SelectField } from "../../components/common/InputField";
import Modal from "../../components/common/Modal";
import Pill, { PillGroup } from "../../components/common/Pill";
import { SettingsGroup, SettingsRow } from "../../components/common/SettingsGroup";
import Toggle from "../../components/common/Toggle";
import { Position, Team, Weekday, RecurringEvent } from "../../model/model";
import formStyles from "../../styles/form.module.css";

import localStyles from "./team-edit-modal.module.css";


interface NewTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (team: Team) => void;
  availablePositions: Position[];
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

const defaultTeam: Team = {
  id: "",
  name: "",
  emoji: "",
  positions: [],
  preferredDays: [],
  maxConflict: 1,
  allowAbsence: true,
  recurringEvents: [],
  dayEndTimes: {},
};

// Simple emoji regex
const EMOJI_REGEX = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;

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

const NewTeamModal = ({ isOpen, onClose, onAdd, availablePositions }: NewTeamModalProps) => {
  const [newTeam, setNewTeam] = useState<Team>(defaultTeam);

  const handleAdd = () => {
    if (!newTeam.name.trim() || !newTeam.emoji.trim()) return;
    
    const teamToAdd: Team = {
      ...newTeam,
      id: newTeam.name.trim()
    };
    
    onAdd(teamToAdd);
    setNewTeam(defaultTeam);
    onClose();
  };

  const handleEmojiChange = (val: string) => {
    const onlyEmojis = val.match(EMOJI_REGEX)?.join("") || "";
    const limited = Array.from(onlyEmojis).slice(0, 1).join("");
    setNewTeam({ ...newTeam, emoji: limited });
  };

  const handleAddEvent = () => {
    const newEvent: RecurringEvent = {
      id: Math.random().toString(36).substring(2, 10),
      label: "",
      day: "Sunday",
      startTime: "09:00",
      endTime: "10:30",
    };
    setNewTeam({ ...newTeam, recurringEvents: [...(newTeam.recurringEvents || []), newEvent] });
  };

  const handleUpdateEvent = (id: string, field: keyof RecurringEvent, value: string | number) => {
    const updated = (newTeam.recurringEvents || []).map((ev) =>
      ev.id === id ? { ...ev, [field]: value } : ev,
    );
    setNewTeam({ ...newTeam, recurringEvents: updated });
  };

  const handleRemoveEvent = (id: string) => {
    const updated = (newTeam.recurringEvents || []).filter((ev) => ev.id !== id);
    setNewTeam({ ...newTeam, recurringEvents: updated });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Team">
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "10px 0" }}>
        {/* Basic Info */}
        <SettingsGroup label="General Information">
          <InputField
            label="Team Name"
            value={newTeam.name}
            placeholder=""
            onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
            autoFocus
          />
          
          <InputField
            label="Team Emoji"
            value={newTeam.emoji}
            placeholder="Select emoji"
            onChange={(e) => handleEmojiChange(e.target.value)}
            maxLength={10}
          />

          <SettingsRow 
            label="Max Concurrent Conflicts" 
            description="Maximum number of simultaneous positions a member can be assigned to within this team on a single day."
          >
            <input
              type="number"
              className={formStyles.formInput}
              value={newTeam.maxConflict?.toString() || "1"}
              onChange={(e) => setNewTeam({ ...newTeam, maxConflict: parseInt(e.target.value) || 1 })}
              style={{ width: "100px", marginTop: "8px" }}
            />
          </SettingsRow>
        </SettingsGroup>

        {/* Positions */}
        <SettingsGroup label="Allowed Positions" description="Select which positions are available for this team">
          <PillGroup>
            {availablePositions
              ?.filter((pos) => !pos.parentId)
              ?.map((pos) => {
                const isActive = newTeam.positions?.some((p) => p.name === pos.name);
                return (
                  <Pill
                    key={pos.name}
                    colour={pos.colour}
                    isActive={isActive}
                    onClick={() => {
                      const current = newTeam.positions || [];
                      const updated = current.find(p => p.name === pos.name)
                        ? current.filter(p => p.name !== pos.name)
                        : [...current, pos];
                      setNewTeam({ ...newTeam, positions: updated });
                    }}
                  >
                    {pos.emoji} {pos.name}
                  </Pill>
                );
              })}
          </PillGroup>
        </SettingsGroup>

        {/* Preferred Days */}
        <SettingsGroup label="Preferred Days & End Times" description="Operating days and when the roster cycle ends">
          <div className={localStyles.preferredDaysGrid}>
            {WEEK_DAYS.map((day) => {
              const isActive = newTeam.preferredDays?.includes(day);
              return (
                <div
                  key={day}
                  className={`${localStyles.preferredDayItem} ${isActive ? localStyles.preferredDayItemActive : ""}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span className={localStyles.dayLabel}>{day}</span>
                    <Toggle
                      isOn={isActive}
                      onToggle={(isOn) => {
                        const current = newTeam.preferredDays || [];
                        const updated = isOn
                          ? [...current, day]
                          : current.filter(d => d !== day);
                        setNewTeam({ ...newTeam, preferredDays: updated });
                      }}
                    />
                  </div>
                  {isActive && (
                    <InputField
                      type="time"
                      label="End Time"
                      value={newTeam.dayEndTimes?.[day] || ""}
                      onChange={(e) => {
                        const currentEndTimes = newTeam.dayEndTimes || {};
                        setNewTeam({ ...newTeam, dayEndTimes: { ...currentEndTimes, [day]: e.target.value } });
                      }}
                      style={{ width: "100%" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </SettingsGroup>

        {/* Calendar Setup */}
        <SettingsGroup label="Calendar Setup">
          <div className={localStyles.sectionHeader} style={{ marginTop: 0, border: "none", paddingTop: 0 }}>
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-dim)" }}>Recurring events for calendar export</span>
            <Button variant="primary" size="small" onClick={handleAddEvent}>
              <Plus size={16} />
            </Button>
          </div>

          <Reorder.Group
            axis="y"
            values={newTeam.recurringEvents || []}
            onReorder={(newOrder) => setNewTeam({ ...newTeam, recurringEvents: newOrder })}
            className={localStyles.eventList}
            style={{ listStyle: "none", padding: 0, margin: 0 }}
          >
            {(newTeam.recurringEvents || []).map((ev) => (
              <EventItem
                key={ev.id}
                ev={ev}
                onUpdate={handleUpdateEvent}
                onRemove={handleRemoveEvent}
              />
            ))}
          </Reorder.Group>
        </SettingsGroup>

        {/* Absence */}
        <SettingsGroup label="Absence Settings">
          <SettingsRow label="Allow Absence" description="Enable users to mark themselves as absent for this team">
            <Toggle
              isOn={newTeam.allowAbsence !== false}
              onToggle={(isOn) => setNewTeam({ ...newTeam, allowAbsence: isOn })}
            />
          </SettingsRow>
        </SettingsGroup>

        <div style={{ marginTop: "10px" }}>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={!newTeam.name.trim() || !newTeam.emoji.trim()}
            style={{ width: "100%", height: "48px" }}
          >
            <Plus size={20} style={{ marginRight: "8px" }} />
            Create Team
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default NewTeamModal;
