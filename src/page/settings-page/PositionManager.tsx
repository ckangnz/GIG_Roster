import { useState, useEffect, useMemo } from "react";

import { CornerDownRight } from "lucide-react";

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
import { Position as GlobalPosition } from "../../model/model";
import {
  fetchPositions,
  updatePositions,
} from "../../store/slices/positionsSlice";

import styles from "./settings-page.module.css";

interface Position extends GlobalPosition {
  parentId?: string;
}

const defaultPosition: Position = {
  name: "",
  emoji: "",
  colour: "",
  parentId: undefined,
  sortByGender: false,
};

const PositionManagement = () => {
  const dispatch = useAppDispatch();
  const {
    positions: reduxPositions,
    fetched: positionsFetched,
    loading: positionsLoading,
  } = useAppSelector((state) => state.positions);
  const [positions, setPositions] = useState<Position[]>(reduxPositions);
  const [newPos, setNewPos] = useState<Position>(defaultPosition);
  const [status, setStatus] = useState("idle");

  const hasChanges = useMemo(() => {
    return JSON.stringify(positions) !== JSON.stringify(reduxPositions);
  }, [positions, reduxPositions]);

  useEffect(() => {
    if (!positionsFetched) {
      dispatch(fetchPositions());
    }
  }, [dispatch, positionsFetched]);

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
      const positionsToSave = positions.map((p) => ({
        ...p,
        parentId: p.parentId === undefined ? undefined : p.parentId,
      }));
      await dispatch(updatePositions(positionsToSave)).unwrap();
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      console.error("Save Error:", e);
      alert(
        "Check Firestore Rules: You may lack permission to write to 'metadata'.",
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
          { text: "Name", minWidth: 80, textAlign: "center", isSticky: true },
          { text: "Order", minWidth: 50 },
          { text: "Emoji", width: 30 },
          { text: "Colour", minWidth: 100 },
          { text: "Sort by Gender", width: 100, textAlign: "center" },
          { text: "Add Child", width: 80, textAlign: "center" },
          { text: "Delete", width: 60, textAlign: "center" },
        ]}
      >
        {positions.map((p, i) => (
          <tr key={`${p.emoji}-${i}`}>
            <SettingsTableInputCell
              name={`name-${i}`}
              value={p.name}
              onChange={(e) => handleUpdate(i, "name", e.target.value)}
              isSticky
            />
            <SettingsTableAnyCell textAlign="center">
              {p.parentId ? (
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
                    onClick={() => move(i, "up")}
                    disabled={i === 0}
                  >
                    ▲
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    isIcon
                    onClick={() => move(i, "down")}
                    disabled={i === positions.length - 1}
                  >
                    ▼
                  </Button>
                </div>
              )}
            </SettingsTableAnyCell>
            <SettingsTableInputCell
              name={`emoji-${i}`}
              value={p.emoji}
              onChange={(e) => handleUpdate(i, "emoji", e.target.value)}
            />
            <SettingsTableColourInputCell
              name={`colour-${i}`}
              value={p.colour}
              onChange={(e) => handleUpdate(i, "colour", e.target.value)}
            />
            <SettingsTableAnyCell textAlign="center">
              <Pill
                colour={
                  p.sortByGender
                    ? "var(--color-success-dark)"
                    : "var(--color-text-dim)"
                }
                isActive={p.sortByGender}
                onClick={() => handleUpdate(i, "sortByGender", !p.sortByGender)}
              >
                {p.sortByGender ? "YES" : "NO"}
              </Pill>
            </SettingsTableAnyCell>
            <SettingsTableAnyCell textAlign="center">
              {!p.parentId && (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => addChildPosition(p.name)}
                  title="Add Child Position"
                >
                  +
                </Button>
              )}
            </SettingsTableAnyCell>
            <SettingsTableAnyCell textAlign="center">
              <Button
                variant="delete"
                size="small"
                onClick={() => deletePosition(i)}
              >
                ×
              </Button>
            </SettingsTableAnyCell>
          </tr>
        ))}
        <tr className="pos-row-new">
          <SettingsTableInputCell
            name={`new-name`}
            value={newPos.name}
            placeholder="Position Name"
            onChange={(e) => setNewPos({ ...newPos, name: e.target.value })}
            isSticky
          />
          <td className="">{""}</td>
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
            >
              {newPos.sortByGender ? "YES" : "NO"}
            </Pill>
          </SettingsTableAnyCell>
          <SettingsTableAnyCell textAlign="center">
            <Button
              onClick={addPosition}
              disabled={!newPos.name.trim() || !newPos.emoji.trim()}
            >
              Add
            </Button>
          </SettingsTableAnyCell>
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
