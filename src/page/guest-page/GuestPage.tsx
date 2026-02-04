import { useState, useEffect } from "react";

import { doc, getDoc, updateDoc } from "firebase/firestore";

import { auth, db } from "../../firebase";
import { AppUser, Position } from "../../model/model";
import "./guest-page.css";

interface GuestPageProps {
  user: AppUser;
  uid: string;
}

const GuestPage = ({ user, uid }: GuestPageProps) => {
  const [name, setName] = useState(user.name || "");
  const [gender, setGender] = useState(user.gender || "");
  const [selectedPositions, setSelectedPositions] = useState<string[]>(
    user.positions || [],
  );
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const docRef = doc(db, "metadata", "positions");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAvailablePositions(docSnap.data().list || []);
        }
      } catch (error) {
        console.error("Error fetching positions:", error);
      }
    };
    fetchPositions();
  }, []);

  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => setStatus("idle"), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const isInvalid = !name.trim() || !gender || selectedPositions.length === 0;

  const handleSave = async () => {
    if (isInvalid) return;
    setStatus("saving");
    try {
      await updateDoc(doc(db, "users", uid), {
        name: name.trim(),
        gender,
        positions: selectedPositions,
      });
      setStatus("success");
    } catch (e) {
      console.error(e);
      setStatus("idle");
    }
  };

  const togglePosition = (posName: string) => {
    setSelectedPositions((prev) =>
      prev.includes(posName)
        ? prev.filter((p) => p !== posName)
        : [...prev, posName],
    );
  };

  return (
    <div className="guest-container">
      <header className="guest-header">
        <h2 className="brand-title">God is Good</h2>
        <p className="status-label">PENDING ADMIN APPROVAL</p>
      </header>

      <div className="form-group">
        <label>Display Name</label>
        <input
          className="text-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />
      </div>

      <div className="form-group">
        <label>Gender</label>
        <div className="gender-toggle-group">
          {["Male", "Female"].map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`pill-button ${g.toLowerCase()} ${gender === g ? "active" : "inactive"}`}
              style={{ flex: 1 }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Positions</label>
        <div className="pill-group">
          {availablePositions.map((pos) => {
            const isActive = selectedPositions.includes(pos.name);
            const hasColor = pos.colour && pos.colour !== "";

            return (
              <button
                key={pos.name}
                onClick={() => togglePosition(pos.name)}
                className={`pill-button ${isActive ? "active" : "inactive"}`}
                style={
                  isActive && hasColor
                    ? {
                        backgroundColor: pos.colour,
                        borderColor: pos.colour,
                      }
                    : {}
                }
              >
                <span className="emoji-span">{pos.emoji}</span>
                {pos.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="action-container">
        <button
          onClick={handleSave}
          disabled={isInvalid || status !== "idle"}
          className={`save-button ${status}`}
        >
          {status === "saving"
            ? "Saving..."
            : status === "success"
              ? "Done ✓"
              : "Update Information"}
        </button>

        <button onClick={() => auth.signOut()} className="logout-link">
          Logout
        </button>
      </div>
    </div>
  );
};

export default GuestPage;
