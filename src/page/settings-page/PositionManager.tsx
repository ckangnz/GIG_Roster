import { useState, useEffect, useMemo, useCallback } from "react";

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
import { removePositionFromAllTeams, updateTeams } from "../../store/slices/teamsSlice";
import { showAlert } from "../../store/slices/uiSlice";
import { cleanupUsersAfterDeletion } from "../../store/slices/userManagementSlice";

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
            key={child.id}
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
  const { userData } = useAppSelector((state) => state.auth);
  const orgId = userData?.orgId;
  const { positions: reduxPositions, loading: positionsLoading } =
    useAppSelector((state) => state.positions);
  const { teams: reduxTeams } = useAppSelector((state) => state.teams);
    
  const [positions, setPositions] = useState<Position[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (orgId) {
      setPositions(reduxPositions.filter(p => p.orgId === orgId));
    }
  }, [reduxPositions, orgId]);

  const hasChanges = useMemo(() => {
    const normalize = (list: Position[]) =>
      list.map((p) => ({
        id: p.id,
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
    if (orgId) {
      setPositions(reduxPositions.filter(p => p.orgId === orgId));
    }
  }, [reduxPositions, orgId]);

  // Group positions into blocks for dragging
  const positionBlocks: PositionBlock[] = useMemo(() => {
    const blocks: PositionBlock[] = [];
    const processed = new Set<string>();

    positions.forEach((p) => {
      if (!p.parentId && !processed.has(p.id)) {
        const children = positions.filter((c) => c.parentId === p.id);
        blocks.push({
          id: p.id,
          parent: p,
          children,
        });
        processed.add(p.id);
        children.forEach((c) => processed.add(c.id));
      }
    });

    return blocks;
  }, [positions]);

  const handleReorderBlocks = (newBlocks: PositionBlock[]) => {
    const flattened = newBlocks.flatMap((b) => [b.parent, ...b.children]);
    setPositions(flattened);
  };

  const handleUpdate = useCallback((
    index: number,
    field: keyof Position,
    value: Position[keyof Position],
  ) => {
    setPositions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === "isCustom" && value === true) {
        updated[index].sortByGender = false;
      }

      return updated;
    });
  }, []);

  const addPosition = (newPos: Position) => {
    if (newPos.parentId) {
      setPositions((prev) => {
        const parentIndex = prev.findIndex(p => p.id === newPos.parentId);
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
      message: "Delete this position? This will remove it from all teams and delete any associated child positions.",
      confirmText: "Delete",
      onConfirm: async () => {
        const positionToDelete = positions[index];
        const positionId = positionToDelete.id;

        // 1. Filter local positions state
        let updatedPositions = positions.filter((_, i) => i !== index);
        if (!positionToDelete.parentId) {
          updatedPositions = updatedPositions.filter(
            (p) => p.parentId !== positionId,
          );
        }
        setPositions(updatedPositions);

        // 2. Remove from all teams in Redux
        dispatch(removePositionFromAllTeams(positionId));

        // 3. Persist Team changes to Firebase immediately
        const currentTeams = reduxTeams.map(team => ({
          ...team,
          positions: (team.positions || []).filter(pId => pId !== positionId)
        }));
        
        await dispatch(updateTeams(currentTeams)).unwrap();

        // 4. Cleanup users
        const idsToCleanup = [positionId];
        if (!positionToDelete.parentId) {
          // If it's a parent, also cleanup child assignments
          const childIds = positions.filter(p => p.parentId === positionId).map(p => p.id);
          idsToCleanup.push(...childIds);
        }

        for (const id of idsToCleanup) {
          await dispatch(cleanupUsersAfterDeletion({ positionId: id })).unwrap();
        }
      }
    }));
  };

  const saveToFirebase = async () => {
    setStatus("saving");
    try {
      if (!orgId) throw new Error("Org ID missing");
      // 1. Save global positions
      const positionsToSave: Position[] = positions.map((p) => {
        const cleanPos: Position = {
          id: p.id,
          orgId: p.orgId || orgId,
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

      // 2. CASCADING RENAME: Sync position names to all teams
      // Because teams store position objects (including names), we must update them.
      // (Wait, teams now only store IDs, so we don't need to update team.positions!)
      // Actually, we should still trigger an update to teams if they were holding objects.
      
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
                (p) => p.id === block.parent.id,
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
