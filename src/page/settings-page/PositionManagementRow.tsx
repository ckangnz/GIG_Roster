import { memo } from "react";

import { DragControls } from "framer-motion";
import { CornerDownRight, Trash2, GripVertical } from "lucide-react";

import Button from "../../components/common/Button";
import {
  SettingsTableAnyCell,
  SettingsTableColourInputCell,
} from "../../components/common/SettingsTable";
import Toggle from "../../components/common/Toggle";
import { Position } from "../../model/model";
import formStyles from "../../styles/form.module.css";

interface PositionManagementRowProps {
  position: Position;
  index: number;
  onUpdate: (
    index: number,
    field: keyof Position,
    value: Position[keyof Position],
  ) => void;
  onDelete: (index: number) => void;
  isDragDisabled?: boolean;
  dragControls?: DragControls;
}

const PositionManagementRow = memo(({
  position,
  index,
  onUpdate,
  onDelete,
  isDragDisabled = false,
  dragControls,
}: PositionManagementRowProps) => {
  const isChild = !!position.parentId;

  return (
    <tr style={{ background: "var(--background-card)", transform: "translateZ(0)" }}>
      <SettingsTableAnyCell isSticky={true}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            paddingLeft: isChild ? "24px" : "0",
            width: "100%",
          }}
        >
          {!isDragDisabled && !isChild && dragControls && (
            <div
              style={{
                cursor: "grab",
                display: "flex",
                alignItems: "center",
                touchAction: "none",
              }}
              onPointerDown={(e) => dragControls.start(e)}
            >
              <GripVertical size={20} style={{ opacity: 0.4 }} />
            </div>
          )}
          {isChild && (
            <CornerDownRight size={18} style={{ opacity: 0.5, flexShrink: 0 }} />
          )}
          <input
            name={`name-${index}`}
            className={formStyles.formInput}
            value={position.name}
            onChange={(e) => onUpdate(index, "name", e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
      </SettingsTableAnyCell>
      <SettingsTableAnyCell>
        <input
          name={`emoji-${index}`}
          className={formStyles.formInput}
          value={position.emoji}
          onChange={(e) => onUpdate(index, "emoji", e.target.value)}
        />
      </SettingsTableAnyCell>
      <SettingsTableColourInputCell
        name={`colour-${index}`}
        value={position.colour}
        onChange={(e) => onUpdate(index, "colour", e.target.value)}
      />
      <SettingsTableAnyCell textAlign="center">
        <Toggle
          isOn={!!position.sortByGender}
          onToggle={(isOn) => onUpdate(index, "sortByGender", isOn)}
          disabled={position.isCustom || isChild}
        />
      </SettingsTableAnyCell>
      <SettingsTableAnyCell textAlign="center">
        <Toggle
          isOn={!!position.isCustom}
          onToggle={(isOn) => onUpdate(index, "isCustom", isOn)}
          disabled={isChild}
        />
      </SettingsTableAnyCell>
      <SettingsTableAnyCell textAlign="center">
        <Button
          variant="delete"
          size="small"
          onClick={() => onDelete(index)}
        >
          <Trash2 size={14} style={{ marginRight: "4px" }} />
          Delete
        </Button>
      </SettingsTableAnyCell>
    </tr>
  );
});

export default PositionManagementRow;
