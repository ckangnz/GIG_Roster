import { useState } from "react";

import { Reorder, useDragControls } from "framer-motion";
import { Plus, Trash2, GripVertical, Clock, Sparkles, CalendarPlus, ChevronDown, ChevronUp, Eraser } from "lucide-react";

import Button from "../../components/common/Button";
import { InputField, SelectField } from "../../components/common/InputField";
import Modal from "../../components/common/Modal";
import Pill, { PillGroup } from "../../components/common/Pill";
import { SettingsGroup } from "../../components/common/SettingsGroup";
import Toggle from "../../components/common/Toggle";
import { useAppDispatch } from "../../hooks/redux";
import {
  Position,
  RecurringEvent,
  Team,
  Weekday,
  RosterSlot,
  RosterMode,
} from "../../model/model";
import { showAlert } from "../../store/slices/uiSlice";

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
  onUpdateField: (field: keyof Team, value: Team[keyof Team]) => void;
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

      <div className={localStyles.eventInputLabel}>
        <InputField
          label="Label"
          value={slot.label}
          placeholder="e.g. 08:00 - 08:15"
          onChange={(e) => onUpdate(slot.id, "label", e.target.value)}
        />
      </div>
      <div className={localStyles.eventInputStart}>
        <InputField
          label="Start"
          type="time"
          value={slot.startTime}
          onChange={(e) => onUpdate(slot.id, "startTime", e.target.value)}
        />
      </div>
      <div className={localStyles.eventInputEnd}>
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
  onUpdateField,
}: TeamEditModalProps) => {
  const dispatch = useAppDispatch();
  const [showGenerator, setShowGenerator] = useState(false);
  const [genStart, setGenStart] = useState("08:00");
  const [genEnd, setGenEnd] = useState("10:00");
  const [genInterval, setGenInterval] = useState(15);

  const handleAddSlot = () => {
    const newSlot: RosterSlot = {
      id: crypto.randomUUID(),
      label: "New Slot",
      startTime: "09:00",
      endTime: "09:15",
    };
    onUpdateField("slots", [...(team.slots || []), newSlot]);
  };

  const handleUpdateSlot = (id: string, field: keyof RosterSlot, value: string) => {
    const updated = (team.slots || []).map((s) =>
      s.id === id ? { ...s, [field]: value } : s,
    );
    onUpdateField("slots", updated);
  };

  const handleRemoveSlot = (id: string) => {
    const updated = (team.slots || []).filter((s) => s.id !== id);
    onUpdateField("slots", updated);
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

    onUpdateField("slots", slots);
    setShowGenerator(false);
  };

  const handleClearSlots = () => {
    dispatch(showAlert({
      title: "Clear All Slots?",
      message: "This will remove all current time slots for this team. This action cannot be undone.",
      confirmText: "Clear All",
      onConfirm: () => onUpdateField("slots", [])
    }));
  };

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
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "10px 0" }}>
        
        {/* Roster Mode Section */}
        <SettingsGroup label="Roster Accuracy" description="How precise should the schedule be?">
          <div className={localStyles.rosterModeContainer}>
            <button 
              className={`${localStyles.modeBtn} ${team.rosterMode !== 'slotted' ? localStyles.modeBtnActive : ""}`}
              onClick={() => onUpdateField("rosterMode", "daily" as RosterMode)}
            >
              <CalendarPlus size={20} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700 }}>Daily</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Simple once-a-day roster</div>
              </div>
            </button>
            <button 
              className={`${localStyles.modeBtn} ${team.rosterMode === 'slotted' ? localStyles.modeBtnActive : ""}`}
              onClick={() => onUpdateField("rosterMode", "slotted" as RosterMode)}
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
        {team.rosterMode === 'slotted' && (
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
              values={team.slots || []}
              onReorder={(newOrder) => onUpdateField("slots", newOrder)}
              className={localStyles.eventList}
              style={{ listStyle: "none", padding: 0, margin: 0 }}
            >
              {(team.slots || []).map((slot) => (
                <SlotItem
                  key={slot.id}
                  slot={slot}
                  onUpdate={handleUpdateSlot}
                  onRemove={handleRemoveSlot}
                />
              ))}
            </Reorder.Group>

            <Button
              onClick={handleAddSlot}
              className={localStyles.addEntryBtn}
              variant="secondary"
              style={{ width: '100%', marginTop: '12px' }}
            >
              <Plus size={16} style={{ marginRight: 8 }} /> Add custom slot
            </Button>
          </SettingsGroup>
        )}

        <SettingsGroup label="Allowed Positions" description="Available roles for this team">
          <PillGroup>
            {availablePositions
              ?.filter((pos) => !pos.parentId)
              ?.map((pos) => {
                const isActive = team.positions?.some((pId) => pId === pos.id || pId === pos.name);
                return (
                  <Pill
                    key={pos.id}
                    colour={pos.colour}
                    isActive={isActive}
                    onClick={() => onTogglePosition(pos)}
                  >
                    {pos.emoji} {pos.name}
                  </Pill>
                );
              })}
          </PillGroup>
        </SettingsGroup>

        <SettingsGroup label="Preferred Days & End Times" description="Operating schedule and roster cut-off times">
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
        </SettingsGroup>

        <SettingsGroup label="Calendar Setup">
          <div className={localStyles.sectionHeader} style={{ marginTop: 0, border: "none", paddingTop: 0 }}>
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-dim)" }}>Events for calendar export</span>
            <Button
              variant="primary"
              size="small"
              onClick={handleAddEvent}
            >
              <Plus size={16} />
            </Button>
          </div>

          <Reorder.Group
            axis="y"
            values={team.recurringEvents || []}
            onReorder={(newOrder) => onUpdateEvents(newOrder)}
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
                padding: "10px 0",
              }}
            >
              No calendar events configured.
            </p>
          )}
        </SettingsGroup>

        <SettingsGroup 
          label="Absence Settings" 
          description="Enable users to mark themselves as absent for this team"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>Allow Member Absences</span>
            <Toggle
              isOn={team.allowAbsence !== false}
              onToggle={(isOn) => onToggleAllowAbsence(isOn)}
            />
          </div>
        </SettingsGroup>
      </div>
    </Modal>
  );
};

export default TeamEditModal;
