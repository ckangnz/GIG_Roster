import { useState, useEffect } from "react";


import { Reorder, useDragControls } from "framer-motion";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Clock, 
  Sparkles, 
  CalendarPlus, 
  ChevronDown, 
  ChevronUp, 
  Eraser 
} from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "../../components/common/Button";
import { InputField, SelectField } from "../../components/common/InputField";
import Modal from "../../components/common/Modal";
import Pill, { PillGroup } from "../../components/common/Pill";
import { SettingsGroup } from "../../components/common/SettingsGroup";
import Toggle from "../../components/common/Toggle";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { 
  Position, 
  RecurringEvent, 
  Team, 
  Weekday, 
  RosterSlot,
} from "../../model/model";
import { selectUserData } from "../../store/slices/authSlice";
import { showAlert } from "../../store/slices/uiSlice";
import formStyles from "../../styles/form.module.css";

import localStyles from "./team-edit-modal.module.css";

interface TeamConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null; // null means "Create Mode"
  onSave: (team: Team) => void;
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

const EMOJI_REGEX = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;

const defaultTeam: Partial<Team> = {
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

const SlotItem = ({
  slot,
  onUpdate,
  onRemove,
}: {
  slot: RosterSlot;
  onUpdate: (id: string, field: keyof RosterSlot, value: string) => void;
  onRemove: (id: string) => void;
}) => {
  const { t } = useTranslation();
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
          label={t('management.team.label')}
          value={slot.label}
          placeholder="e.g. 08:00 - 08:15"
          onChange={(e) => onUpdate(slot.id, "label", e.target.value)}
        />
      </div>
      <div className={localStyles.eventInputStart}>
        <InputField
          label={t('management.team.start')}
          type="time"
          value={slot.startTime}
          onChange={(e) => onUpdate(slot.id, "startTime", e.target.value)}
        />
      </div>
      <div className={localStyles.eventInputEnd}>
        <InputField
          label={t('management.team.end')}
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
  const { t } = useTranslation();
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
          label={t('management.team.eventName')}
          value={ev.label}
          placeholder="e.g. Practice"
          onChange={(e) => onUpdate(ev.id, "label", e.target.value)}
        />
      </div>
      <div className={localStyles.eventInputDay}>
        <SelectField
          label={t('management.team.weekDay')}
          value={ev.day}
          onChange={(e) =>
            onUpdate(ev.id, "day", e.target.value as Weekday)
          }
        >
          {WEEK_DAYS.map((d) => (
            <option key={d} value={d}>
              {t(`common.weekdays.${d.toLowerCase()}`, { defaultValue: d })}
            </option>
          ))}
        </SelectField>
      </div>
      <div className={localStyles.eventInputStart}>
        <InputField
          label={t('management.team.starts')}
          type="time"
          value={ev.startTime}
          onChange={(e) => onUpdate(ev.id, "startTime", e.target.value)}
        />
      </div>
      <div className={localStyles.eventInputEnd}>
        <InputField
          label={t('management.team.finishes')}
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

const TeamConfigModal = ({ 
  isOpen, 
  onClose, 
  team, 
  onSave, 
  availablePositions 
}: TeamConfigModalProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const userData = useAppSelector(selectUserData);
  const orgId = userData?.orgId;

  const [draft, setDraft] = useState<Partial<Team>>(defaultTeam);
  
  // UI States
  const [showGenerator, setShowGenerator] = useState(false);
  const [genStart, setGenStart] = useState("08:00");
  const [genEnd, setGenEnd] = useState("10:00");
  const [genInterval, setGenInterval] = useState(15);

  useEffect(() => {
    if (isOpen) {
      const draftData = team ? JSON.parse(JSON.stringify(team)) : { ...defaultTeam, id: crypto.randomUUID() };
      const timer = setTimeout(() => {
        setDraft(draftData);
        setShowGenerator(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, team]);

  const updateDraft = (updates: Partial<Team>) => {
    setDraft(prev => ({ ...prev, ...updates }));
  };

  const handleEmojiChange = (val: string) => {
    const onlyEmojis = val.match(EMOJI_REGEX)?.join("") || "";
    const limited = Array.from(onlyEmojis).slice(0, 1).join("");
    updateDraft({ emoji: limited });
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

    updateDraft({ slots });
    setShowGenerator(false);
  };

  const handleClearSlots = () => {
    dispatch(showAlert({
      title: t('management.team.clearSlotsTitle'),
      message: t('management.team.clearSlotsConfirm'),
      confirmText: t('common.delete'),
      onConfirm: () => updateDraft({ slots: [] })
    }));
  };

  const handleAddSlot = () => {
    const newSlot: RosterSlot = {
      id: crypto.randomUUID(),
      label: "New Slot",
      startTime: "09:00",
      endTime: "09:15",
    };
    updateDraft({ slots: [...(draft.slots || []), newSlot] });
  };

  const handleAddEvent = () => {
    const newEvent: RecurringEvent = {
      id: Math.random().toString(36).substring(2, 10),
      label: "",
      day: "Sunday",
      startTime: "09:00",
      endTime: "10:30",
    };
    updateDraft({ recurringEvents: [...(draft.recurringEvents || []), newEvent] });
  };

  const isFormValid = 
    (draft.name || "").trim() !== "" && 
    (draft.emoji || "").trim() !== "" && 
    (draft.maxConflict !== undefined && draft.maxConflict > 0) &&
    !!orgId;

  const footer = (
    <div style={{ display: "flex", gap: "12px", width: "100%" }}>
      <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
        {t('common.cancel')}
      </Button>
      <Button 
        variant="primary" 
        onClick={() => { 
          if (orgId) {
            onSave({
              ...draft as Team,
              id: draft.id || crypto.randomUUID(),
              orgId: draft.orgId || orgId
            }); 
            onClose(); 
          }
        }} 
        disabled={!isFormValid}
        style={{ flex: 2 }}
      >
        {team ? t('management.team.applyChanges') : t('management.team.createTeam')}
      </Button>
    </div>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={team ? t('management.team.editTitle', { name: team.name }) : t('management.team.createTitle')}
      footer={footer}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "10px 0" }}>
        
        {/* Basic Info */}
        <SettingsGroup label={t('management.team.generalInfo')}>
          <InputField
            label={t('management.team.teamName')}
            value={draft.name}
            placeholder="e.g. Production"
            onChange={(e) => updateDraft({ name: e.target.value })}
            error={draft.name !== undefined && !draft.name.trim()}
            errorText={t('management.team.nameRequired')}
          />
          
          <InputField
            label={t('management.team.teamEmoji')}
            value={draft.emoji}
            placeholder={t('onboarding.searchPlaceholder')}
            onChange={(e) => handleEmojiChange(e.target.value)}
            maxLength={10}
            error={draft.emoji !== undefined && !draft.emoji.trim()}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--color-text-dim)", fontWeight: 700 }}>
              {t('management.team.maxConflict')}
            </span>
            <input
              type="number"
              className={`${formStyles.formInput} ${(!draft.maxConflict || draft.maxConflict < 1) ? formStyles.inputError : ""}`}
              value={draft.maxConflict?.toString() || "1"}
              onChange={(e) => updateDraft({ maxConflict: parseInt(e.target.value) || 1 })}
              style={{ width: "100px" }}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-dim)", margin: 0 }}>
              {t('management.team.maxConflictDesc')}
            </p>
          </div>
        </SettingsGroup>

        {/* Roster Mode Section */}
        <SettingsGroup label={t('management.team.rosterAccuracy')} description={t('management.team.rosterAccuracyDesc')}>
          <div className={localStyles.rosterModeContainer}>
            <button 
              className={`${localStyles.modeBtn} ${draft.rosterMode !== 'slotted' ? localStyles.modeBtnActive : ""}`}
              onClick={() => updateDraft({ rosterMode: 'daily' })}
            >
              <CalendarPlus size={20} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700 }}>{t('management.team.daily')}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t('management.team.dailyDesc')}</div>
              </div>
            </button>
            <button 
              className={`${localStyles.modeBtn} ${draft.rosterMode === 'slotted' ? localStyles.modeBtnActive : ""}`}
              onClick={() => updateDraft({ rosterMode: 'slotted' })}
              disabled
              title="Slotted Mode coming soon"
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            >
              <Clock size={20} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700 }}>{t('management.team.slotted')} ({t('onboarding.comingSoon')})</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t('management.team.slottedDesc')}</div>
              </div>
            </button>
          </div>
        </SettingsGroup>

        {/* Slotted Mode Management */}
        {draft.rosterMode === 'slotted' && (
          <SettingsGroup label={t('management.team.timeSlotsConfig')} description={t('management.team.timeSlotsDesc')}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <Button 
                variant="secondary" 
                size="small" 
                onClick={() => setShowGenerator(!showGenerator)}
                style={{ flex: 1, justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} />
                  {t('management.team.autoGenerate')}
                </div>
                {showGenerator ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </Button>
              <Button 
                variant="delete" 
                size="small" 
                onClick={handleClearSlots}
                title={t('management.team.clearSlots')}
                isIcon
              >
                <Eraser size={18} />
              </Button>
            </div>

            {showGenerator && (
              <div className={localStyles.slotGeneratorCard}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <InputField label={t('management.team.from')} type="time" value={genStart} onChange={(e) => setGenStart(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <InputField label={t('management.team.to')} type="time" value={genEnd} onChange={(e) => setGenEnd(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <InputField 
                      label={t('management.team.everyMins')} 
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
                    style={{ height: '36px' }}
                  >
                    {t('management.team.generate')}
                  </Button>
                </div>
              </div>
            )}

            <Reorder.Group
              axis="y"
              values={draft.slots || []}
              onReorder={(newOrder) => updateDraft({ slots: newOrder })}
              className={localStyles.eventList}
              style={{ listStyle: "none", padding: 0, margin: 0 }}
            >
              {(draft.slots || []).map((slot) => (
                <SlotItem
                  key={slot.id}
                  slot={slot}
                  onUpdate={(id, field, val) => {
                    const updated = (draft.slots || []).map(s => s.id === id ? { ...s, [field]: val } : s);
                    updateDraft({ slots: updated });
                  }}
                  onRemove={(id) => {
                    const updated = (draft.slots || []).filter(s => s.id !== id);
                    updateDraft({ slots: updated });
                  }}
                />
              ))}
            </Reorder.Group>

            <Button
              onClick={handleAddSlot}
              className={localStyles.addEntryBtn}
              variant="secondary"
              style={{ width: '100%', marginTop: '12px' }}
            >
              <Plus size={16} style={{ marginRight: 8 }} /> {t('management.team.addCustomSlot')}
            </Button>
          </SettingsGroup>
        )}

        {/* Positions */}
        <SettingsGroup label={t('management.team.allowedPositions')} description={t('management.team.allowedPositionsDesc')}>
          <PillGroup>
            {availablePositions
              ?.filter((pos) => !pos.parentId)
              ?.map((pos) => {
                const isActive = draft.positions?.some((pId) => pId === pos.id);
                return (
                  <Pill
                    key={pos.id}
                    colour={pos.colour}
                    isActive={isActive}
                    onClick={() => {
                      const current = draft.positions || [];
                      const updated = current.includes(pos.id)
                        ? current.filter(pId => pId !== pos.id)
                        : [...current, pos.id];
                      updateDraft({ positions: updated });
                    }}
                  >
                    {pos.emoji} {pos.name}
                  </Pill>
                );
              })}
          </PillGroup>
        </SettingsGroup>

        {/* Preferred Days */}
        <SettingsGroup label={t('management.team.preferredDays')} description={t('management.team.preferredDaysDesc')}>
          <div className={localStyles.preferredDaysGrid}>
            {WEEK_DAYS.map((day) => {
              const isActive = draft.preferredDays?.includes(day);
              return (
                <div
                  key={day}
                  className={`${localStyles.preferredDayItem} ${isActive ? localStyles.preferredDayItemActive : ""}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span className={localStyles.dayLabel}>{t(`common.weekdays.${day.toLowerCase()}`, { defaultValue: day })}</span>
                    <Toggle
                      isOn={!!isActive}
                      onToggle={(isOn) => {
                        const current = draft.preferredDays || [];
                        const updated = isOn
                          ? [...current, day]
                          : current.filter(d => d !== day);
                        updateDraft({ preferredDays: updated });
                      }}
                    />
                  </div>
                  {isActive && (
                    <InputField
                      type="time"
                      label={t('management.team.endTime')}
                      value={draft.dayEndTimes?.[day] || ""}
                      onChange={(e) => {
                        const currentEndTimes = draft.dayEndTimes || {};
                        updateDraft({ dayEndTimes: { ...currentEndTimes, [day]: e.target.value } });
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
        <SettingsGroup label={t('management.team.calendarSetup')} description={t('management.team.calendarSetupDesc')}>
          <div className={localStyles.sectionHeader} style={{ marginTop: 0, border: "none", paddingTop: 0 }}>
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-dim)" }}>{t('management.team.eventConfig')}</span>
            <Button variant="primary" size="small" onClick={handleAddEvent}>
              <Plus size={16} />
            </Button>
          </div>

          <Reorder.Group
            axis="y"
            values={draft.recurringEvents || []}
            onReorder={(newOrder) => updateDraft({ recurringEvents: newOrder })}
            className={localStyles.eventList}
            style={{ listStyle: "none", padding: 0, margin: 0 }}
          >
            {(draft.recurringEvents || []).map((ev) => (
              <EventItem
                key={ev.id}
                ev={ev}
                onUpdate={(id, field, val) => {
                  const updated = (draft.recurringEvents || []).map(e => e.id === id ? { ...e, [field]: val } : e);
                  updateDraft({ recurringEvents: updated });
                }}
                onRemove={(id) => {
                  const updated = (draft.recurringEvents || []).filter(e => e.id !== id);
                  updateDraft({ recurringEvents: updated });
                }}
              />
            ))}
          </Reorder.Group>
        </SettingsGroup>

        {/* Absence */}
        <SettingsGroup 
          label={t('management.team.absenceSettings')} 
          description={t('management.team.absenceSettingsDesc')}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>{t('management.team.allowAbsence')}</span>
            <Toggle
              isOn={draft.allowAbsence !== false}
              onToggle={(isOn) => updateDraft({ allowAbsence: isOn })}
            />
          </div>
        </SettingsGroup>
      </div>
    </Modal>
  );
};

export default TeamConfigModal;
