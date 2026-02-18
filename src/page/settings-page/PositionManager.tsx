import { useState, useEffect, useMemo } from "react";

import { Plus } from "lucide-react";

import PositionManagementRow from "./PositionManagementRow";
import Button from "../../components/common/Button";
import Pill from "../../components/common/Pill";
import SaveFooter from "../../components/common/SaveFooter";
import SettingsTable, {
  SettingsTableAnyCell,
  SettingsTableColourInputCell,
  SettingsTableInputCell,
} from "../../components/common/SettingsTable";
import Spinner from "../../components/common/Spinner";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Position } from "../../model/model";
import { updatePositions } from "../../store/slices/positionsSlice";

import styles from "./settings-page.module.css";

const defaultPosition: Position = {
  name: "",
  emoji: "",
  colour: "",
  parentId: undefined,
  sortByGender: false,
};

const PositionManagement = () => {
  const dispatch = useAppDispatch();
  const { positions: reduxPositions, loading: positionsLoading } =
    useAppSelector((state) => state.positions);
  const [positions, setPositions] = useState<Position[]>(reduxPositions);
  const [newPos, setNewPos] = useState<Position>(defaultPosition);
  const [status, setStatus] = useState("idle");

  const hasChanges = useMemo(() => {
    const normalize = (list: Position[]) =>
      list.map((p) => ({
        name: p.name || "",
        emoji: p.emoji || "",
        colour: p.colour || "",
        parentId: p.parentId || undefined,
        sortByGender: !!p.sortByGender,
        isCustom: !!p.isCustom,
      }));
    return (
      JSON.stringify(normalize(positions)) !==
      JSON.stringify(normalize(reduxPositions))
    );
  }, [positions, reduxPositions]);

  useEffect(() => {
    setPositions(reduxPositions);
  }, [reduxPositions]);

  const handleUpdate = (
    index: number,
    field: keyof Position,
    value: Position[keyof Position],
  ) => {
    const updated = [...positions];
    updated[index] = { ...updated[index], [field]: value };
    setPositions(updated);
  };

  const move = (index: number, direction: "up" | "down") => {
    const updated = [...positions];
    const currentPosition = updated[index];
    const currentParentId = currentPosition.parentId;

    const getBlockInfo = (
      startPosIndex: number,
    ): { block: Position[]; startIndex: number; endIndex: number } => {
      const startPosition = updated[startPosIndex];
      if (!startPosition) return { block: [], startIndex: -1, endIndex: -1 };

      const block: Position[] = [];
      const queue: Position[] = [startPosition];
      const visitedNames = new Set<string>();

      let minIndex = startPosIndex;
      let maxIndex = startPosIndex;

      let head = 0;
      while (head < queue.length) {
        const p = queue[head++];

        if (visitedNames.has(p.name)) continue;
        visitedNames.add(p.name);
        block.push(p);

        updated.forEach((pos, idx) => {
          if (pos.parentId === p.name && !visitedNames.has(pos.name)) {
            queue.push(pos);
            minIndex = Math.min(minIndex, idx);
            maxIndex = Math.max(maxIndex, idx);
          }
        });
      }

      const sortedBlock = block;
      return { block: sortedBlock, startIndex: minIndex, endIndex: maxIndex };
    };

    if (!currentParentId) {
      const currentBlockInfo = getBlockInfo(index);
      const {
        block: currentBlock,
        startIndex: currentBlockStartIndex,
        endIndex: currentBlockEndIndex,
      } = currentBlockInfo;

      if (!currentBlock || currentBlock.length === 0) return;

      if (direction === "up") {
        if (currentBlockStartIndex === 0) return;

        let targetBlockEndIndex = currentBlockStartIndex - 1;
        while (
          targetBlockEndIndex >= 0 &&
          updated[targetBlockEndIndex].parentId
        ) {
          targetBlockEndIndex--;
        }
        if (targetBlockEndIndex < 0) return;

        const targetBlockInfo = getBlockInfo(targetBlockEndIndex);
        const { block: targetBlock, startIndex: targetBlockStartIndex } =
          targetBlockInfo;

        if (!targetBlock || targetBlock.length === 0) return;

        const newPositions = [
          ...updated.slice(0, targetBlockStartIndex),
          ...currentBlock,
          ...targetBlock,
          ...updated.slice(currentBlockEndIndex + 1),
        ].filter(Boolean);

        setPositions(newPositions);
      } else {
        if (currentBlockEndIndex === updated.length - 1) return;

        let targetBlockStartIndex = currentBlockEndIndex + 1;
        while (
          targetBlockStartIndex < updated.length &&
          updated[targetBlockStartIndex].parentId
        ) {
          targetBlockStartIndex++;
        }
        if (targetBlockStartIndex >= updated.length) return;

        const targetBlockInfo = getBlockInfo(targetBlockStartIndex);
        const { block: targetBlock, startIndex: targetBlockActualStartIndex } =
          targetBlockInfo;

        if (!targetBlock || targetBlock.length === 0) return;

        const newPositions = [
          ...updated.slice(0, currentBlockStartIndex),
          ...targetBlock,
          ...currentBlock,
          ...updated.slice(targetBlockActualStartIndex + targetBlock.length),
        ].filter(Boolean);

        setPositions(newPositions);
      }
    } else {
      const allSiblings = updated.filter((p) => p.parentId === currentParentId);
      const currentSiblingIndex = allSiblings.findIndex(
        (s) => s.name === currentPosition.name,
      );

      const newSiblingIndex =
        currentSiblingIndex + (direction === "up" ? -1 : 1);
      if (newSiblingIndex < 0 || newSiblingIndex >= allSiblings.length) return;

      const siblingToSwapWith = allSiblings[newSiblingIndex];
      const indexOfCurrentInUpdated = updated.indexOf(currentPosition);
      const indexOfSwapWithInUpdated = updated.indexOf(siblingToSwapWith);

      if (indexOfCurrentInUpdated === -1 || indexOfSwapWithInUpdated === -1)
        return;

      const newPositions = [...updated];
      newPositions[indexOfCurrentInUpdated] = siblingToSwapWith;
      newPositions[indexOfSwapWithInUpdated] = currentPosition;
      setPositions(newPositions);
    }
  };

  const addPosition = () => {
    if (!newPos.name.trim() || !newPos.emoji.trim()) {
      return alert("Please provide both an emoji and a name.");
    }
    setPositions([...positions, newPos]);
    setNewPos(defaultPosition);
  };

  const deletePosition = (index: number) => {
    if (
      window.confirm(
        "Delete this position? This will remove it from the global list, and any associated child positions.",
      )
    ) {
      const positionToDelete = positions[index];
      let updatedPositions = positions.filter((_, i) => i !== index);

      if (!positionToDelete.parentId) {
        updatedPositions = updatedPositions.filter(
          (p) => p.parentId !== positionToDelete.name,
        );
      }
      setPositions(updatedPositions);
    }
  };

  const saveToFirebase = async () => {
    setStatus("saving");
    try {
      const positionsToSave = positions.map((p) => {
        const cleanPos: Position = {
          name: p.name || "",
          emoji: p.emoji || "",
          colour: p.colour || "",
          sortByGender: !!p.sortByGender,
          isCustom: !!p.isCustom,
          customLabels: p.customLabels || [],
        };
        if (p.parentId) cleanPos.parentId = p.parentId;
        return cleanPos;
      });
      await dispatch(updatePositions(positionsToSave)).unwrap();
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      console.error("Save Error:", e);
      alert(
        "Error saving: " + (e instanceof Error ? e.message : "Unknown error"),
      );
      setStatus("idle");
    }
  };

  const addChildPosition = (parentName: string) => {
    setPositions((prevPositions) => {
      const newChild = { ...defaultPosition, parentId: parentName };
      const parentIndex = prevPositions.findIndex((p) => p.name === parentName);

      if (parentIndex === -1) {
        return [...prevPositions, newChild];
      }

      let insertIndex = parentIndex;
      while (
        insertIndex + 1 < prevPositions.length &&
        prevPositions[insertIndex + 1].parentId === parentName
      ) {
        insertIndex++;
      }

      const updated = [
        ...prevPositions.slice(0, insertIndex + 1),
        newChild,
        ...prevPositions.slice(insertIndex + 1),
      ];
      return updated;
    });
  };

  const handleCancel = () => {
    setPositions(reduxPositions);
  };

  if (positionsLoading) {
    return <Spinner />;
  }

  return (
    <div className={styles.managementWrapper}>
      <SettingsTable
        headers={[
          {
            text: "Name",
            minWidth: 80,
            width: 200,
            textAlign: "center",
          },
          { text: "Order", width: 30, textAlign: "center" },
          { text: "Emoji", width: 30, textAlign: "center" },
          { text: "Colour", minWidth: 100, textAlign: "center" },
          { text: "Sort by Gender", width: 100, textAlign: "center" },
          { text: "Custom Headings", width: 100, textAlign: "center" },
          { text: "Add Child", width: 80, textAlign: "center" },
          { text: "Delete", width: 60, textAlign: "center" },
        ]}
      >
        {positions.map((p, i) => (
          <PositionManagementRow
            key={`${p.emoji}-${i}`}
            position={p}
            index={i}
            onUpdate={handleUpdate}
            onMove={move}
            onDelete={deletePosition}
            onAddChild={addChildPosition}
            isFirst={i === 0}
            isLast={i === positions.length - 1}
          />
        ))}
        <tr className="pos-row-new">
          <SettingsTableInputCell
            name={`new-name`}
            value={newPos.name}
            placeholder="Position Name"
            onChange={(e) => setNewPos({ ...newPos, name: e.target.value })}
            isSticky
          />
          <SettingsTableAnyCell textAlign="center">{""}</SettingsTableAnyCell>
          <SettingsTableInputCell
            name={`new-emoji`}
            value={newPos.emoji}
            placeholder="😎"
            onChange={(e) => setNewPos({ ...newPos, emoji: e.target.value })}
          />
          <SettingsTableColourInputCell
            name={`new-colour`}
            value={newPos.colour}
            placeholder="#FFFFFF"
            onChange={(e) => setNewPos({ ...newPos, colour: e.target.value })}
          />
          <SettingsTableAnyCell textAlign="center">
            <Pill
              colour={
                newPos.sortByGender
                  ? "var(--color-success-dark)"
                  : "var(--color-text-dim)"
              }
              isActive={newPos.sortByGender}
              onClick={() =>
                setNewPos({ ...newPos, sortByGender: !newPos.sortByGender })
              }
              isDisabled={newPos.isCustom}
            >
              {newPos.sortByGender ? "YES" : "NO"}
            </Pill>
          </SettingsTableAnyCell>
          <SettingsTableAnyCell textAlign="center">
            <Pill
              colour={
                newPos.isCustom
                  ? "var(--color-success-dark)"
                  : "var(--color-text-dim)"
              }
              isActive={newPos.isCustom}
              onClick={() =>
                setNewPos({ ...newPos, isCustom: !newPos.isCustom })
              }
            >
              {newPos.isCustom ? "YES" : "NO"}
            </Pill>
          </SettingsTableAnyCell>
          <SettingsTableAnyCell textAlign="center">
            <Button
              onClick={addPosition}
              disabled={!newPos.name.trim() || !newPos.emoji.trim()}
            >
              <Plus size={16} style={{ marginRight: "6px" }} />
              Add
            </Button>
          </SettingsTableAnyCell>
          <SettingsTableAnyCell textAlign="center">{""}</SettingsTableAnyCell>
        </tr>
      </SettingsTable>

      {hasChanges && (
        <SaveFooter
          label="Unsaved position changes"
          saveText="Save Positions"
          onSave={saveToFirebase}
          onCancel={handleCancel}
          isSaving={status === "saving"}
        />
      )}
    </div>
  );
};

export default PositionManagement;
