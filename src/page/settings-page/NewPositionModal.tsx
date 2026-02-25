import { useState } from "react";

import { Plus } from "lucide-react";

import Button from "../../components/common/Button";
import { InputField, SelectField } from "../../components/common/InputField";
import Modal from "../../components/common/Modal";
import { SettingsGroup, SettingsRow } from "../../components/common/SettingsGroup";
import Toggle from "../../components/common/Toggle";
import { Position } from "../../model/model";
import formStyles from "../../styles/form.module.css";

import styles from "./settings-page.module.css";


interface NewPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (position: Position) => void;
  availableParents: Position[];
}

const defaultPosition: Position = {
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
  const [newPos, setNewPos] = useState<Position>(defaultPosition);
  const [isChild, setIsChild] = useState(false);

  const handleAdd = () => {
    if (!newPos.name.trim() || !newPos.emoji.trim()) return;
    
    const positionToAdd = {
      ...newPos,
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
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Position">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "10px 0" }}>
        <InputField
          label="Position Name"
          value={newPos.name}
          placeholder=""
          onChange={(e) => setNewPos({ ...newPos, name: e.target.value })}
          autoFocus
        />
        
        <InputField
          label="Emoji Symbol"
          value={newPos.emoji}
          placeholder="Select an emoji"
          onChange={(e) => handleEmojiChange(e.target.value)}
          maxLength={10} // Emojis can be long in terms of characters
        />

        <div className={styles.addNewField}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-dim)", marginBottom: "8px", display: "block" }}>
            Brand Colour
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
            label="Is Child Position" 
            description="Nested under a parent position"
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
                  label="Select Parent Position"
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
              label="Sort by Gender" 
              description="Group males together in columns"
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
              label="Custom Headings" 
              description="Use custom text instead of user names"
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
            disabled={!newPos.name.trim() || !newPos.emoji.trim() || (isChild && !newPos.parentId)}
            style={{ width: "100%", height: "48px" }}
          >
            <Plus size={20} style={{ marginRight: "8px" }} />
            Create Position
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default NewPositionModal;
