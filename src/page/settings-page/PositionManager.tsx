import { useEffect, useState } from "react";

import { doc, getDoc, updateDoc } from "firebase/firestore";

import { db } from "../../firebase";
import { Position } from "../../model/model";
import "./position-management.css";

const PositionManagement = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newPos, setNewPos] = useState<Position>({
    name: "",
    emoji: "",
    colour: "#646cff",
  });

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
    setNewPos({ name: "", emoji: "", colour: "#646cff" });
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
    <div className="pos-mgmt-container">
      <div className="pos-scroll-area">
        <table className="pos-mgmt-table">
          <thead>
            <tr>
              <th className="w-order">Order</th>
              <th className="w-emoji">Emoji</th>
              <th>Name</th>
              <th className="w-color">Color</th>
              <th className="w-action"></th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p, i) => (
              <tr key={`${p.name}-${i}`}>
                <td>
                  <div className="order-controls">
                    <button onClick={() => move(i, "up")} disabled={i === 0}>
                      ▲
                    </button>
                    <button
                      onClick={() => move(i, "down")}
                      disabled={i === positions.length - 1}
                    >
                      ▼
                    </button>
                  </div>
                </td>
                <td>
                  <input
                    className="pos-input center"
                    value={p.emoji}
                    onChange={(e) => handleUpdate(i, "emoji", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="pos-input"
                    value={p.name}
                    onChange={(e) => handleUpdate(i, "name", e.target.value)}
                  />
                </td>
                <td>
                  <div className="color-picker-group">
                    <input
                      type="color"
                      value={p.colour}
                      onChange={(e) =>
                        handleUpdate(i, "colour", e.target.value)
                      }
                    />
                    <input
                      className="pos-input hex-input"
                      value={p.colour}
                      onChange={(e) =>
                        handleUpdate(i, "colour", e.target.value)
                      }
                    />
                  </div>
                </td>
                <td>
                  <button
                    onClick={() => deletePosition(i)}
                    className="pos-btn-del"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            <tr className="pos-row-new">
              <td className="new-tag">NEW</td>
              <td>
                <input
                  className="pos-input center"
                  placeholder="emoji"
                  value={newPos.emoji}
                  onChange={(e) =>
                    setNewPos({ ...newPos, emoji: e.target.value })
                  }
                />
              </td>
              <td>
                <input
                  className="pos-input"
                  placeholder="Position Name"
                  value={newPos.name}
                  onChange={(e) =>
                    setNewPos({ ...newPos, name: e.target.value })
                  }
                />
              </td>
              <td>
                <div className="color-picker-group">
                  <input
                    type="color"
                    value={newPos.colour}
                    onChange={(e) =>
                      setNewPos({ ...newPos, colour: e.target.value })
                    }
                  />
                  <input
                    className="pos-input hex-input"
                    value={newPos.colour}
                    onChange={(e) =>
                      setNewPos({ ...newPos, colour: e.target.value })
                    }
                  />
                </div>
              </td>
              <td>
                <button onClick={addPosition} className="pos-btn-add">
                  +
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="admin-footer">
        <button
          className="save-button bulk"
          onClick={saveToFirebase}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Position Config"}
        </button>
      </div>
    </div>
  );
};

export default PositionManagement;
