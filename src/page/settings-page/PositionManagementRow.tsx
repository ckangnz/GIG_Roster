import { CornerDownRight, Plus, Trash2 } from "lucide-react";

import Button from "../../components/common/Button";
import Pill from "../../components/common/Pill";
import {
  SettingsTableAnyCell,
  SettingsTableColourInputCell,
  SettingsTableInputCell,
} from "../../components/common/SettingsTable";
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
        <Pill
          colour={
            position.sortByGender
              ? "var(--color-success-dark)"
              : "var(--color-text-dim)"
          }
          isActive={position.sortByGender}
          onClick={() => onUpdate(index, "sortByGender", !position.sortByGender)}
          isDisabled={position.isCustom}
        >
          {position.sortByGender ? "YES" : "NO"}
        </Pill>
      </SettingsTableAnyCell>
      <SettingsTableAnyCell textAlign="center">
        <Pill
          colour={
            position.isCustom
              ? "var(--color-success-dark)"
              : "var(--color-text-dim)"
          }
          isActive={position.isCustom}
          onClick={() => onUpdate(index, "isCustom", !position.isCustom)}
        >
          {position.isCustom ? "YES" : "NO"}
        </Pill>
      </SettingsTableAnyCell>
      <SettingsTableAnyCell textAlign="center">
        {!position.parentId && (
          <Button
            variant="secondary"
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
