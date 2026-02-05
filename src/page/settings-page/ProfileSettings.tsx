import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { AppUser, Position } from "../../model/model";

interface ProfileSettingsProps {
  userData: AppUser;
  uid: string;
}

const ProfileSettings = ({ userData, uid }: ProfileSettingsProps) => {
  const [gender, setGender] = useState(userData.gender || "");
  const [selectedPositions, setSelectedPositions] = useState<string[]>(
    userData.positions || [],
  );
  const [isActive, setIsActive] = useState(userData.isActive ?? true); // Default to true if undefined

  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const docSnap = await getDoc(doc(db, "metadata", "positions"));
        if (docSnap.exists()) setAvailablePositions(docSnap.data().list || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchPositions();
  }, []);

  const handleSave = async () => {
    if (!uid) return;
    setStatus("saving");
    try {
      const updateData = {
        gender,
        positions: selectedPositions,
        isActive,
      };
      await updateDoc(doc(db, "users", uid), updateData);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      console.error(e);
      setStatus("idle");
    }
  };

  const togglePosition = (name: string) => {
    setSelectedPositions((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
    );
  };

  return (
    <section className="profile-card">
      <div className="profile-readonly">
        <p>
          <strong>Name:</strong> {userData.name}
        </p>
        <p>
          <strong>Email:</strong> {userData.email}
        </p>
      </div>

      <div className="form-group">
        <label>Gender</label>
        <div className="gender-toggle-group">
          {["Male", "Female"].map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`pill-button ${g.toLowerCase()} ${gender === g ? "active" : "inactive"}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>My Positions</label>
        <div className="pill-group">
          {availablePositions.map((pos) => {
            const isSelected = selectedPositions.includes(pos.name);
            return (
              <button
                key={pos.name}
                onClick={() => togglePosition(pos.name)}
                className={`pill-button ${isSelected ? "active" : "inactive"}`}
                style={
                  isSelected && pos.colour
                    ? { backgroundColor: pos.colour, borderColor: pos.colour }
                    : {}
                }
              >
                <span>{pos.emoji}</span> {pos.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="form-group">
        <label>Availability Status</label>
        <div className="status-toggle-container">
          <button
            className={`toggle-switch ${isActive ? "on" : "off"}`}
            onClick={() => setIsActive(!isActive)}
          >
            {isActive ? "ACTIVE & AVAILABLE" : "INACTIVE / AWAY"}
          </button>
          <p className="field-hint">
            Turn off if you want to be hidden from the roster.
          </p>
        </div>
      </div>

      <div className="action-container">
        <button
          onClick={handleSave}
          disabled={status !== "idle"}
          className={`save-button ${status}`}
        >
          {status === "saving"
            ? "Saving..."
            : status === "success"
              ? "Done ✓"
              : "Update Profile"}
        </button>
        <button onClick={() => auth.signOut()} className="logout-btn">
          Logout
        </button>
      </div>
    </section>
  );
};

export default ProfileSettings;
