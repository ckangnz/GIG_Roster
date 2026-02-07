import { useEffect, useState } from "react";

import { doc, getDoc, updateDoc } from "firebase/firestore";

import SettingsTable, {
  SettingsTableAnyCell,
  SettingsTableColourInputCell,
  SettingsTableInputCell,
} from "../../components/common/SettingsTable";
import { db } from "../../firebase";
import { Position } from "../../model/model";

const defaultPosition = {
  name: "",
  emoji: "",
  colour: "#f0f0f0",
};

const PositionManagement = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newPos, setNewPos] = useState<Position>(defaultPosition);

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const docRef = doc(db, "metadata", "positions");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();

          setPositions(Array.isArray(data.list) ? data.list : []);
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
        "Delete this position? This will remove it from the global list.",
      )
    ) {
      setPositions(positions.filter((_, i) => i !== index));
    }
  };

  const saveToFirebase = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, "metadata", "positions");
      await updateDoc(docRef, { list: positions });
      alert("Position configuration saved successfully!");
    } catch (e) {
      console.error("Save Error:", e);
      alert(
        "Check Firestore Rules: You may lack permission to write to 'metadata'.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SettingsTable
        headers={[
          { text: "Order", minWidth: 50, textAlign: "center" },
          { text: "Emoji", width: 30 },
          { text: "Name", minWidth: 80 },
          { text: "Colour", minWidth: 100 },
          { text: "" },
        ]}
      >
        {positions.map((p, i) => (
          <tr key={`${p.name}-${i}`}>
            <SettingsTableAnyCell>
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
            </SettingsTableAnyCell>
            <SettingsTableInputCell
              value={p.emoji}
              onChange={(e) => handleUpdate(i, "emoji", e.target.value)}
            />
            <SettingsTableInputCell
              value={p.name}
              onChange={(e) => handleUpdate(i, "name", e.target.value)}
            />
            <SettingsTableColourInputCell
              value={p.colour}
              onChange={(e) => handleUpdate(i, "colour", e.target.value)}
            />
            <SettingsTableAnyCell>
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
            value={newPos.emoji}
            placeholder="😎"
            onChange={(e) => setNewPos({ ...newPos, emoji: e.target.value })}
          />
          <SettingsTableInputCell
            value={newPos.name}
            placeholder="Position Name"
            onChange={(e) => setNewPos({ ...newPos, name: e.target.value })}
          />
          <SettingsTableColourInputCell
            value={newPos.colour}
            onChange={(e) => setNewPos({ ...newPos, colour: e.target.value })}
          />
          <SettingsTableAnyCell>
            <button
              onClick={addPosition}
              className="icon-button icon-button--add"
            >
              +
            </button>
          </SettingsTableAnyCell>
        </tr>
      </SettingsTable>

      <div className="settings-footer">
        <button
          className="save-button"
          onClick={saveToFirebase}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </>
  );
};

export default PositionManagement;
