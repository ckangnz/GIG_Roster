import { useState, useEffect, useMemo } from "react";

import { Reorder, useDragControls } from "framer-motion";
import { Plus } from "lucide-react";

import NewPositionModal from "./NewPositionModal";
import PositionManagementRow from "./PositionManagementRow";
import Button from "../../components/common/Button";
import SaveFooter from "../../components/common/SaveFooter";
import SettingsTable from "../../components/common/SettingsTable";
import Spinner from "../../components/common/Spinner";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Position } from "../../model/model";
import { updatePositions } from "../../store/slices/positionsSlice";
import { showAlert } from "../../store/slices/uiSlice";

import styles from "./settings-page.module.css";

interface PositionBlock {
  id: string;
  parent: Position;
  children: Position[];
}

const DraggableRowBlock = ({
  block,
  indexInPositions,
  onUpdate,
  onDelete,
}: {
  block: PositionBlock;
  indexInPositions: number;
  onUpdate: (index: number, field: keyof Position, value: Position[keyof Position]) => void;
  onDelete: (index: number) => void;
}) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={block}
      dragListener={false}
      dragControls={dragControls}
      as="tbody"
      layout
    >
      <PositionManagementRow
        position={block.parent}
        index={indexInPositions}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragControls={dragControls}
      />
      {block.children.map((child, childIdx) => {
        const actualIdx = indexInPositions + 1 + childIdx;
        return (
          <PositionManagementRow
            key={child.name}
            position={child}
            index={actualIdx}
            onUpdate={onUpdate}
            onDelete={() => onDelete(actualIdx)}
            isDragDisabled
          />
        );
      })}
    </Reorder.Item>
  );
};

const PositionManagement = () => {
  const dispatch = useAppDispatch();
  const { positions: reduxPositions, loading: positionsLoading } =
    useAppSelector((state) => state.positions);
  const [positions, setPositions] = useState<Position[]>(reduxPositions);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  // Group positions into blocks for dragging
  const positionBlocks: PositionBlock[] = useMemo(() => {
    const blocks: PositionBlock[] = [];
    const processed = new Set<string>();

    positions.forEach((p) => {
      if (!p.parentId && !processed.has(p.name)) {
        const children = positions.filter((c) => c.parentId === p.name);
        blocks.push({
          id: p.name,
          parent: p,
          children,
        });
        processed.add(p.name);
        children.forEach((c) => processed.add(c.name));
      }
    });

    return blocks;
  }, [positions]);

  const handleReorderBlocks = (newBlocks: PositionBlock[]) => {
    const flattened = newBlocks.flatMap((b) => [b.parent, ...b.children]);
    setPositions(flattened);
  };

  const handleUpdate = (
    index: number,
    field: keyof Position,
    value: Position[keyof Position],
  ) => {
    setPositions((prev) => {
      const updated = [...prev];
      const oldName = updated[index].name;
      const updates: Partial<Position> = { [field]: value };

      if (field === "isCustom" && value === true) {
        updates.sortByGender = false;
      }

      updated[index] = { ...updated[index], ...updates };

      // If name changed, update all children's parentId
      if (field === "name" && !updated[index].parentId) {
        updated.forEach((p, i) => {
          if (p.parentId === oldName) {
            updated[i] = { ...p, parentId: value as string };
          }
        });
      }

      return updated;
    });
  };

  const addPosition = (newPos: Position) => {
    if (newPos.parentId) {
      setPositions((prev) => {
        const parentIndex = prev.findIndex(p => p.name === newPos.parentId);
        if (parentIndex === -1) return [...prev, newPos];
        
        let insertIndex = parentIndex;
        while (
          insertIndex + 1 < prev.length &&
          prev[insertIndex + 1].parentId === newPos.parentId
        ) {
          insertIndex++;
        }
        return [
          ...prev.slice(0, insertIndex + 1),
          newPos,
          ...prev.slice(insertIndex + 1)
        ];
      });
    } else {
      setPositions([...positions, newPos]);
    }
  };

  const deletePosition = (index: number) => {
    dispatch(showAlert({
      title: "Delete Position",
      message: "Delete this position? This will remove it from the global list, and any associated child positions.",
      confirmText: "Delete",
      onConfirm: () => {
        const positionToDelete = positions[index];
        let updatedPositions = positions.filter((_, i) => i !== index);

        if (!positionToDelete.parentId) {
          updatedPositions = updatedPositions.filter(
            (p) => p.parentId !== positionToDelete.name,
          );
        }
        setPositions(updatedPositions);
      }
    }));
  };

  const saveToFirebase = async () => {
    setStatus("saving");
    try {
      const positionsToSave = positions.map((p) => {
        const cleanPos: Position = {
          id: p.id || p.name,
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
      dispatch(showAlert({
        title: "Save Error",
        message: "Error saving: " + (e instanceof Error ? e.message : "Unknown error"),
        showCancel: false
      }));
      setStatus("idle");
    }
  };

  const handleCancel = () => {
    setPositions(reduxPositions);
  };

  const availableParents = useMemo(() => {
    return positions.filter(p => !p.parentId);
  }, [positions]);

  if (positionsLoading) {
    return <Spinner />;
  }

  return (
    <div className={styles.managementWrapper}>
      <SettingsTable
        headers={[
          {
            text: "Name",
            minWidth: 150,
            width: 250,
            textAlign: "center",
          },
          { text: "Emoji", width: 30, textAlign: "center" },
          { text: "Colour", minWidth: 100, textAlign: "center" },
          { text: "Sort by Gender", width: 100, textAlign: "center" },
          { text: "Custom Headings", width: 100, textAlign: "center" },
          { text: "Delete", width: 60, textAlign: "center" },
        ]}
        tableAs={Reorder.Group}
        tableProps={{
          axis: "y",
          values: positionBlocks,
          onReorder: handleReorderBlocks,
          as: "table",
          layout: true,
        }}
        customBody={
          <>
            {positionBlocks.map((block) => {
              const parentIdx = positions.findIndex(
                (p) => p.name === block.parent.name,
              );
              return (
                <DraggableRowBlock
                  key={block.id}
                  block={block}
                  indexInPositions={parentIdx}
                  onUpdate={handleUpdate}
                  onDelete={deletePosition}
                />
              );
            })}
          </>
        }
      >
        {null}
      </SettingsTable>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} style={{ marginRight: "8px" }} />
          New Position
        </Button>
      </div>

      <NewPositionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={addPosition}
        availableParents={availableParents}
      />

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
