import { useEffect, useState } from "react";

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { CornerDownRight } from "lucide-react";

import SettingsTable, {
  SettingsTableAnyCell,
  SettingsTableColourInputCell,
  SettingsTableInputCell,
} from "../../components/common/SettingsTable";
import { db } from "../../firebase";
import { Position as GlobalPosition } from "../../model/model";

interface Position extends GlobalPosition {
  parentId?: string;
}

const defaultPosition: Position = {
  name: "",
  emoji: "",
  colour: "#f0f0f0",
  parentId: undefined,
};

const PositionManagement = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [newPos, setNewPos] = useState<Position>(defaultPosition);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const docRef = doc(db, "metadata", "positions");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setPositions(
            Array.isArray(data.list)
              ? data.list.map((p: GlobalPosition) => ({
                  ...p,
                  parentId: (p as Position).parentId || undefined,
                }))
              : [],
          );
        }
      } catch (error) {
        console.error("Error fetching positions:", error);
      }
    };
    fetchPositions();
  }, []);

  const handleUpdate = (
    index: number,
    field: keyof Position,
    value: string,
  ) => {
    const updated = [...positions];
    updated[index] = { ...updated[index], [field]: value };
    setPositions(updated);
  };

  const move = (index: number, direction: "up" | "down") => {
    const updated = [...positions];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= updated.length) return;

    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;

    setPositions(updated);
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
      const docRef = doc(db, "metadata", "positions");
      const positionsToSave = positions.map((p) => ({
        ...p,
        parentId: p.parentId === undefined ? null : p.parentId,
      }));
      await updateDoc(docRef, { list: positionsToSave });
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

  return (
    <>
      <SettingsTable
        headers={[
          { text: "Order", minWidth: 50, textAlign: "center" },
          { text: "Emoji", width: 30 },
          { text: "Name", minWidth: 80 },
          { text: "Colour", minWidth: 100 },
          { text: "Add Child", width: 80, textAlign: "center" },
          { text: "Delete", width: 60, textAlign: "center" },
        ]}
      >
        {positions.map((p, i) => (
          <tr key={`${p.emoji}-${i}`}>
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
                  <button
                    className="icon-button icon-button--small icon-button--secondary"
                    onClick={() => move(i, "up")}
                    disabled={i === 0}
                  >
                    ▲
                  </button>
                  <button
                    className="icon-button icon-button--small icon-button--secondary"
                    onClick={() => move(i, "down")}
                    disabled={i === positions.length - 1}
                  >
                    ▼
                  </button>
                </div>
              )}
            </SettingsTableAnyCell>
            <SettingsTableInputCell
              name={`emoji-${i}`}
              value={p.emoji}
              onChange={(e) => handleUpdate(i, "emoji", e.target.value)}
            />
            <SettingsTableInputCell
              name={`name-${i}`}
              value={p.name}
              onChange={(e) => handleUpdate(i, "name", e.target.value)}
            />
            <SettingsTableColourInputCell
              name={`colour-${i}`}
              value={p.colour}
              onChange={(e) => handleUpdate(i, "colour", e.target.value)}
            />
            <SettingsTableAnyCell textAlign="center">
              {!p.parentId && (
                <button
                  className="icon-button icon-button--add-child"
                  onClick={() => addChildPosition(p.name)}
                  title="Add Child Position"
                >
                  +
                </button>
              )}
            </SettingsTableAnyCell>
            <SettingsTableAnyCell textAlign="center">
              <button
                className="icon-button icon-button--delete"
                onClick={() => deletePosition(i)}
              >
                ×
              </button>
            </SettingsTableAnyCell>
          </tr>
        ))}
        <tr className="pos-row-new">
          <td className=""></td>
          <SettingsTableInputCell
            name={`new-emoji`}
            value={newPos.emoji}
            placeholder="😎"
            onChange={(e) => setNewPos({ ...newPos, emoji: e.target.value })}
          />
          <SettingsTableInputCell
            name={`new-name`}
            value={newPos.name}
            placeholder="Position Name"
            onChange={(e) => setNewPos({ ...newPos, name: e.target.value })}
          />
          <SettingsTableColourInputCell
            name={`new-colour`}
            value={newPos.colour}
            onChange={(e) => setNewPos({ ...newPos, colour: e.target.value })}
          />
          <td className=""></td>
          <SettingsTableAnyCell textAlign="center">
            <button
              onClick={addPosition}
              className="icon-button icon-button--add"
              disabled={!newPos.name.trim() || !newPos.emoji.trim()}
            >
              +
            </button>
          </SettingsTableAnyCell>
        </tr>
      </SettingsTable>

      <div className="settings-footer">
        <button
          className={`save-button ${status}`}
          onClick={saveToFirebase}
          disabled={status !== "idle"}
        >
          {status === "saving"
            ? "Saving..."
            : status === "success"
              ? "Done ✓"
              : "Save"}
        </button>
      </div>
    </>
  );
};

export default PositionManagement;
