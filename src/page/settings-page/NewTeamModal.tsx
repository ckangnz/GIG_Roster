import { useState } from "react";

import { Reorder, useDragControls } from "framer-motion";
import { Plus, Trash2, GripVertical, Clock, CalendarPlus, Sparkles, ChevronDown, ChevronUp, Eraser } from "lucide-react";

import Button from "../../components/common/Button";
import { InputField, SelectField } from "../../components/common/InputField";
import Modal from "../../components/common/Modal";
import Pill, { PillGroup } from "../../components/common/Pill";
import { SettingsGroup, SettingsRow } from "../../components/common/SettingsGroup";
import Toggle from "../../components/common/Toggle";
import { useAppDispatch } from "../../hooks/redux";
import { Position, Team, Weekday, RecurringEvent, RosterSlot } from "../../model/model";
import { showAlert } from "../../store/slices/uiSlice";
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
  rosterMode: "daily",
  slots: [],
};

const EMOJI_REGEX = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;

const SlotItem = ({
  slot,
  onUpdate,
  onRemove,
}: {
  slot: RosterSlot;
  onUpdate: (id: string, field: keyof RosterSlot, value: string) => void;
  onRemove: (id: string) => void;
}) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={slot}
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

      <div style={{ flex: 2 }}>
        <InputField
          label="Label"
          value={slot.label}
          placeholder="e.g. 08:00 - 08:15"
          onChange={(e) => onUpdate(slot.id, "label", e.target.value)}
        />
      </div>
      <div style={{ flex: 1 }}>
        <InputField
          label="Start"
          type="time"
          value={slot.startTime}
          onChange={(e) => onUpdate(slot.id, "startTime", e.target.value)}
        />
      </div>
      <div style={{ flex: 1 }}>
        <InputField
          label="End"
          type="time"
          value={slot.endTime}
          onChange={(e) => onUpdate(slot.id, "endTime", e.target.value)}
        />
      </div>
      <Button
        variant="delete"
        size="small"
        isIcon
        className={localStyles.deleteBtn}
        onClick={() => onRemove(slot.id)}
      >
        <Trash2 size={16} />
      </Button>
    </Reorder.Item>
  );
};

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
  const dispatch = useAppDispatch();
  const [newTeam, setNewTeam] = useState<Team>(defaultTeam);
  
  // Generator states
  const [showGenerator, setShowGenerator] = useState(false);
  const [genStart, setGenStart] = useState("08:00");
  const [genEnd, setGenEnd] = useState("10:00");
  const [genInterval, setGenInterval] = useState(15);

  const handleAdd = () => {
    if (!newTeam.name.trim() || !newTeam.emoji.trim()) return;
    
    const teamToAdd: Team = {
      ...newTeam,
      id: crypto.randomUUID()
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

  const handleAutoGenerateSlots = () => {
    const slots: RosterSlot[] = [];
    const [startH, startM] = genStart.split(":").map(Number);
    const [endH, endM] = genEnd.split(":").map(Number);
    
    let currentTotalMinutes = startH * 60 + startM;
    let endTotalMinutes = endH * 60 + endM;

    if (endTotalMinutes <= currentTotalMinutes) {
      endTotalMinutes += 24 * 60;
    }

    while (currentTotalMinutes < endTotalMinutes) {
      const nextTotalMinutes = currentTotalMinutes + genInterval;
      
      const formatTime = (total: number) => {
        const h = Math.floor(total / 60) % 24;
        const m = total % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };

      const start = formatTime(currentTotalMinutes);
      const end = formatTime(Math.min(nextTotalMinutes, endTotalMinutes));

      slots.push({
        id: crypto.randomUUID(),
        label: `${start} - ${end}`,
        startTime: start,
        endTime: end
      });

      currentTotalMinutes = nextTotalMinutes;
    }

    setNewTeam({ ...newTeam, slots });
    setShowGenerator(false);
  };

  const handleClearSlots = () => {
    dispatch(showAlert({
      title: "Clear All Slots?",
      message: "This will remove all current time slots for this team. This action cannot be undone.",
      confirmText: "Clear All",
      onConfirm: () => setNewTeam({ ...newTeam, slots: [] })
    }));
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

        {/* Roster Mode Section */}
        <SettingsGroup label="Roster Accuracy" description="How precise should the schedule be?">
          <div className={localStyles.rosterModeContainer}>
            <button 
              className={`${localStyles.modeBtn} ${newTeam.rosterMode !== 'slotted' ? localStyles.modeBtnActive : ""}`}
              onClick={() => setNewTeam({ ...newTeam, rosterMode: 'daily' })}
            >
              <CalendarPlus size={20} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700 }}>Daily</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Simple once-a-day roster</div>
              </div>
            </button>
            <button 
              className={`${localStyles.modeBtn} ${newTeam.rosterMode === 'slotted' ? localStyles.modeBtnActive : ""}`}
              onClick={() => setNewTeam({ ...newTeam, rosterMode: 'slotted' })}
              disabled
              title="Slotted Mode coming soon"
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            >
              <Clock size={20} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700 }}>Slotted (Coming Soon)</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Time-slots & Shifts</div>
              </div>
            </button>
          </div>
        </SettingsGroup>

        {/* Slotted Mode Management */}
        {newTeam.rosterMode === 'slotted' && (
          <SettingsGroup label="Time Slots Configuration" description="Define the timing pattern for this team">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <Button 
                variant="secondary" 
                size="small" 
                onClick={() => setShowGenerator(!showGenerator)}
                style={{ flex: 1, justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} />
                  Auto-Generate Slots
                </div>
                {showGenerator ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </Button>
              <Button 
                variant="delete" 
                size="small" 
                onClick={handleClearSlots}
                title="Clear all slots"
                isIcon
              >
                <Eraser size={18} />
              </Button>
            </div>

            {showGenerator && (
              <div className={localStyles.slotGeneratorCard}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <InputField label="From" type="time" value={genStart} onChange={(e) => setGenStart(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <InputField label="To" type="time" value={genEnd} onChange={(e) => setGenEnd(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <InputField 
                      label="Every (mins)" 
                      type="number" 
                      value={genInterval} 
                      onChange={(e) => setGenInterval(Number(e.target.value))} 
                      placeholder="e.g. 480"
                    />
                  </div>
                  <Button 
                    variant="primary" 
                    onClick={handleAutoGenerateSlots} 
                    disabled={genInterval <= 0}
                    style={{ height: '42px' }}
                  >
                    Generate
                  </Button>
                </div>
              </div>
            )}

            <Reorder.Group
              axis="y"
              values={newTeam.slots || []}
              onReorder={(newOrder) => setNewTeam({ ...newTeam, slots: newOrder })}
              className={localStyles.eventList}
              style={{ listStyle: "none", padding: 0, margin: 0 }}
            >
              {(newTeam.slots || []).map((slot) => (
                <SlotItem
                  key={slot.id}
                  slot={slot}
                  onUpdate={(id, field, val) => {
                    const updated = (newTeam.slots || []).map(s => s.id === id ? { ...s, [field]: val } : s);
                    setNewTeam({ ...newTeam, slots: updated });
                  }}
                  onRemove={(id) => {
                    const updated = (newTeam.slots || []).filter(s => s.id !== id);
                    setNewTeam({ ...newTeam, slots: updated });
                  }}
                />
              ))}
            </Reorder.Group>
          </SettingsGroup>
        )}

        {/* Positions */}
        <SettingsGroup label="Allowed Positions" description="Select which positions are available for this team">
          <PillGroup>
            {availablePositions
              ?.filter((pos) => !pos.parentId)
              ?.map((pos) => {
                const isActive = newTeam.positions?.some((pId) => pId === pos.id || pId === pos.name);
                return (
                  <Pill
                    key={pos.id}
                    colour={pos.colour}
                    isActive={isActive}
                    onClick={() => {
                      const current = newTeam.positions || [];
                      const updated = current.some(pId => pId === pos.id || pId === pos.name)
                        ? current.filter(pId => pId !== pos.id && pId !== pos.name)
                        : [...current, pos.id];
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
