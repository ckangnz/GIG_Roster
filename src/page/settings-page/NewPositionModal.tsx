import { useState } from "react";

import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";


import Button from "../../components/common/Button";
import { InputField, SelectField } from "../../components/common/InputField";
import Modal from "../../components/common/Modal";
import { SettingsGroup, SettingsRow } from "../../components/common/SettingsGroup";
import Toggle from "../../components/common/Toggle";
import { useAppSelector } from "../../hooks/redux";
import { Position } from "../../model/model";
import formStyles from "../../styles/form.module.css";

import styles from "./settings-page.module.css";


interface NewPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (position: Position) => void;
  availableParents: Position[];
}

const defaultPosition: Partial<Position> = {
  name: "",
  emoji: "",
  colour: "#FFFFFF",
  parentId: undefined,
  sortByGender: false,
  isCustom: false,
};

// Simple emoji regex
const EMOJI_REGEX = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;

const NewPositionModal = ({ isOpen, onClose, onAdd, availableParents }: NewPositionModalProps) => {
  const { t } = useTranslation();
  const { userData } = useAppSelector((state) => state.auth);
  const orgId = userData?.orgId;

  const [newPos, setNewPos] = useState<Partial<Position>>(defaultPosition);
  const [isChild, setIsChild] = useState(false);

  const handleAdd = () => {
    if (!newPos.name?.trim() || !newPos.emoji?.trim() || !orgId) return;
    
    const positionToAdd: Position = {
      ...newPos as Position,
      id: crypto.randomUUID(),
      orgId,
      parentId: isChild ? newPos.parentId : undefined
    };
    
    onAdd(positionToAdd);
    setNewPos(defaultPosition);
    setIsChild(false);
    onClose();
  };

  const handleEmojiChange = (val: string) => {
    // Keep only emojis
    const onlyEmojis = val.match(EMOJI_REGEX)?.join("") || "";
    // Limit to 1 emoji (usually sufficient for positions)
    const limited = Array.from(onlyEmojis).slice(0, 1).join("");
    setNewPos({ ...newPos, emoji: limited });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('management.position.newPositionModal')}>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "10px 0" }}>
        <InputField
          label={t('management.position.positionName')}
          value={newPos.name}
          placeholder=""
          onChange={(e) => setNewPos({ ...newPos, name: e.target.value })}
          autoFocus
        />
        
        <InputField
          label={t('management.position.emojiSymbol')}
          value={newPos.emoji}
          placeholder={t('onboarding.searchPlaceholder')}
          onChange={(e) => handleEmojiChange(e.target.value)}
          maxLength={10} // Emojis can be long in terms of characters
        />

        <div className={styles.addNewField}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-dim)", marginBottom: "8px", display: "block" }}>
            {t('management.position.brandColour')}
          </label>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <input
              type="color"
              className={formStyles.colorInput}
              value={newPos.colour || "#FFFFFF"}
              onChange={(e) => setNewPos({ ...newPos, colour: e.target.value })}
              style={{ width: "50px", height: "40px" }}
            />
            <input
              className={formStyles.formInput}
              value={newPos.colour}
              placeholder="#Hex"
              onChange={(e) => setNewPos({ ...newPos, colour: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <SettingsGroup>
          <SettingsRow 
            label={t('management.position.isChild')}
            description={t('management.position.isChildDesc')}
            action={
              <Toggle
                isOn={isChild}
                onToggle={(isOn) => {
                  setIsChild(isOn);
                  if (isOn && !newPos.parentId && availableParents.length > 0) {
                    setNewPos({ ...newPos, parentId: availableParents[0].name });
                  }
                }}
              />
            }
          >
            {isChild && (
              <div style={{ marginTop: "12px" }}>
                <SelectField
                  label={t('management.position.selectParent')}
                  value={newPos.parentId || ""}
                  onChange={(e) => setNewPos({ ...newPos, parentId: e.target.value })}
                >
                  {availableParents.map(p => (
                    <option key={p.name} value={p.name}>{p.emoji} {p.name}</option>
                  ))}
                </SelectField>
              </div>
            )}
          </SettingsRow>
        </SettingsGroup>

        {!isChild && (
          <SettingsGroup>
            <SettingsRow 
              label={t('management.position.genderSort')}
              description={t('management.position.genderSortDesc')}
              action={
                <Toggle
                  isOn={!!newPos.sortByGender}
                  onToggle={(isOn) => setNewPos({ ...newPos, sortByGender: isOn })}
                  disabled={newPos.isCustom}
                />
              }
            />
            
            <div style={{ height: "1px", background: "var(--border-color-table)", margin: "4px 0" }} />

            <SettingsRow 
              label={t('management.position.customHeadings')}
              description={t('management.position.customHeadingsDesc')}
              action={
                <Toggle
                  isOn={!!newPos.isCustom}
                  onToggle={(isOn) => {
                    const updates: Partial<Position> = { isCustom: isOn };
                    if (isOn) updates.sortByGender = false;
                    setNewPos({ ...newPos, ...updates });
                  }}
                />
              }
            />
          </SettingsGroup>
        )}

        <div style={{ marginTop: "10px" }}>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={!newPos.name?.trim() || !newPos.emoji?.trim() || (isChild && !newPos.parentId)}
            style={{ width: "100%", height: "48px" }}
          >
            <Plus size={20} style={{ marginRight: "8px" }} />
            {t('management.position.createPosition')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default NewPositionModal;
