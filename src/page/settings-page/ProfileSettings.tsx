import { useState, useEffect } from "react";

import { doc, getDoc, updateDoc } from "firebase/firestore";

import { db, auth } from "../../firebase";
import { AppUser, Position } from "../../model/model";

interface ProfileSettingsProps {
  userData: AppUser;
  uid: string;
}

const ProfileSettings = ({ userData, uid }: ProfileSettingsProps) => {
  const PRIMARY_ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
  const isPrimaryAdmin = userData.email === PRIMARY_ADMIN_EMAIL;

  // 1. Initialize state directly from props.
  // No need for useEffect to "sync" these on first load.
  const [gender, setGender] = useState(userData.gender || "");
  const [selectedPositions, setSelectedPositions] = useState<string[]>(
    userData.positions || [],
  );
  const [isAdmin, setIsAdmin] = useState(userData.isAdmin || false);
  const [isApproved, setIsApproved] = useState(userData.isApproved || false);
  const [isActive, setIsActive] = useState(userData.isActive || false);

  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [status, setStatus] = useState("idle");

  // Keep this effect: it's for external data (Firestore), not internal state syncing.
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

  // 2. Logic to handle "resetting" the form if the userData prop updates
  // without triggering a cascade render warning.
  // We use a separate state or just rely on the parent providing a new 'key'.

  const handleSave = async () => {
    if (!uid) return;
    setStatus("saving");
    try {
      const updateData = {
        gender,
        positions: selectedPositions,
        ...(userData.isAdmin && {
          isAdmin: isPrimaryAdmin ? true : isAdmin,
          isApproved: isPrimaryAdmin ? true : isApproved,
          isActive: isActive,
        }),
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
      {/* ... (Rest of your JSX remains exactly the same) ... */}
      <div className="profile-readonly">
        <p>
          <strong>Name:</strong> {userData.name}
        </p>
        <p>
          <strong>Email:</strong> {userData.email}
        </p>
        <p>
          <strong>Account Status:</strong>{" "}
          {userData.isApproved ? "✅ Approved" : "⏳ Pending"}
        </p>
      </div>

      <hr className="settings-divider" />

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

      {userData.isAdmin && (
        <div className="admin-only-fields">
          <label>Administrative Controls (Self)</label>
          <div className="admin-toggles">
            <div className="admin-status-row">
              <span>Approved</span>
              <button
                disabled={isPrimaryAdmin}
                className={`toggle-switch ${isApproved ? "on" : "off"}`}
                onClick={() => !isPrimaryAdmin && setIsApproved(!isApproved)}
              >
                {isApproved ? "YES" : "NO"}
              </button>
            </div>
            <div className="admin-status-row">
              <span>Admin Rights</span>
              <button
                disabled={isPrimaryAdmin}
                className={`toggle-switch ${isAdmin ? "on" : "off"}`}
                onClick={() => !isPrimaryAdmin && setIsAdmin(!isAdmin)}
              >
                {isAdmin ? "ADMIN" : "USER"}
              </button>
            </div>
            <div className="admin-status-row">
              <span>Active Status</span>
              <button
                className={`toggle-switch ${isActive ? "on" : "off"}`}
                onClick={() => setIsActive(!isActive)}
              >
                {isActive ? "ACTIVE" : "INACTIVE"}
              </button>
            </div>
          </div>
          {isPrimaryAdmin && (
            <p className="primary-admin-note">
              Primary Admin rights are locked.
            </p>
          )}
        </div>
      )}

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
              : "Save Profile"}
        </button>
        <button onClick={() => auth.signOut()} className="logout-btn">
          Logout
        </button>
      </div>
    </section>
  );
};

export default ProfileSettings;
