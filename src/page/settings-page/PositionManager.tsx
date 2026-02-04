import { useState, useEffect } from "react";

import { doc, getDoc, updateDoc } from "firebase/firestore";

import { db } from "../../firebase";
import { Position } from "../../model/model";

const PositionManager = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎸");

  const docRef = doc(db, "metadata", "positions");

  const fetchPositions = async () => {
    const snap = await getDoc(docRef);
    if (snap.exists()) setPositions(snap.data().list || []);
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const docRef = doc(db, "metadata", "positions");
      const snap = await getDoc(docRef);

      if (isMounted && snap.exists()) {
        setPositions(snap.data().list || []);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const addPosition = async () => {
    const updated = [...positions, { name: newName, emoji: newEmoji }];
    await updateDoc(docRef, { list: updated });
    setNewName("");
    fetchPositions();
  };

  return (
    <div className="admin-section">
      <div className="pos-input">
        <input
          value={newEmoji}
          onChange={(e) => setNewEmoji(e.target.value)}
          style={{ width: "40px" }}
        />
        <input
          value={newName}
          placeholder="Position Name"
          onChange={(e) => setNewName(e.target.value)}
        />
        <button onClick={addPosition}>Add</button>
      </div>
      <ul>
        {positions.map((p) => (
          <li key={p.name}>
            {p.emoji} {p.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PositionManager;
