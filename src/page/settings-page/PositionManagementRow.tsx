import { CornerDownRight, Plus, Trash2 } from "lucide-react";

import Button from "../../components/common/Button";
import {
  SettingsTableAnyCell,
  SettingsTableColourInputCell,
  SettingsTableInputCell,
} from "../../components/common/SettingsTable";
import Toggle from "../../components/common/Toggle";
import { Position } from "../../model/model";

interface PositionManagementRowProps {
  position: Position;
  index: number;
  onUpdate: (
    index: number,
    field: keyof Position,
    value: Position[keyof Position],
  ) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  onDelete: (index: number) => void;
  onAddChild: (parentName: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

const PositionManagementRow = ({
  position,
  index,
  onUpdate,
  onMove,
  onDelete,
  onAddChild,
  isFirst,
  isLast,
}: PositionManagementRowProps) => {
  return (
    <tr>
      <SettingsTableInputCell
        name={`name-${index}`}
        value={position.name}
        onChange={(e) => onUpdate(index, "name", e.target.value)}
        isSticky
      />
      <SettingsTableAnyCell textAlign="center">
        {position.parentId ? (
          <CornerDownRight />
        ) : (
          <div
            style={{
              display: "flex",
              gap: "4px",
              justifyContent: "center",
            }}
          >
            <Button
              variant="secondary"
              size="small"
              isIcon
              onClick={() => onMove(index, "up")}
              disabled={isFirst}
            >
              ▲
            </Button>
            <Button
              variant="secondary"
              size="small"
              isIcon
              onClick={() => onMove(index, "down")}
              disabled={isLast}
            >
              ▼
            </Button>
          </div>
        )}
      </SettingsTableAnyCell>
      <SettingsTableInputCell
        name={`emoji-${index}`}
        value={position.emoji}
        onChange={(e) => onUpdate(index, "emoji", e.target.value)}
      />
      <SettingsTableColourInputCell
        name={`colour-${index}`}
        value={position.colour}
        onChange={(e) => onUpdate(index, "colour", e.target.value)}
      />
      <SettingsTableAnyCell textAlign="center">
        <Toggle
          isOn={!!position.sortByGender}
          onToggle={(isOn) => onUpdate(index, "sortByGender", isOn)}
          disabled={position.isCustom}
        />
      </SettingsTableAnyCell>
      <SettingsTableAnyCell textAlign="center">
        <Toggle
          isOn={!!position.isCustom}
          onToggle={(isOn) => onUpdate(index, "isCustom", isOn)}
        />
      </SettingsTableAnyCell>
      <SettingsTableAnyCell textAlign="center">
        {!position.parentId && (
          <Button
            variant="primary"
            size="small"
            onClick={() => onAddChild(position.name)}
            title="Add Child Position"
          >
            <Plus size={14} style={{ marginRight: "4px" }} />
            Add
          </Button>
        )}
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
};

export default PositionManagementRow;
