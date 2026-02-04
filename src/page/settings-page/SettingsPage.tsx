import { useState, useEffect } from "react";

import { doc, getDoc, updateDoc } from "firebase/firestore";

import PositionManager from "./PositionManager";
import UserManagement from "./UserManagement";
import { SettingsSection } from "../../constants/navigation";
import { db, auth } from "../../firebase";
import { AppUser, Position } from "../../model/model";
import "./settings.css";

interface SettingsPageProps {
  userData: AppUser;
  uid: string;
  activeSection: string | null;
}

const SettingsPage = ({ userData, uid, activeSection }: SettingsPageProps) => {
  // Primary Admin check from Environment Variables
  const PRIMARY_ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
  const isPrimaryAdmin = userData.email === PRIMARY_ADMIN_EMAIL;

  // Local Form State
  const [gender, setGender] = useState(userData.gender || "");
  const [selectedPositions, setSelectedPositions] = useState<string[]>(
    userData.positions || [],
  );
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);

  // Admin-specific local state
  const [isAdmin, setIsAdmin] = useState(userData.isAdmin || false);
  const [isApproved, setIsApproved] = useState(userData.isApproved || false);
  const [isActive, setIsActive] = useState(userData.isActive || false);

  const [status, setStatus] = useState("idle");

  // Sync local state if userData prop updates
  useEffect(() => {
    setGender(userData.gender || "");
    setSelectedPositions(userData.positions || []);
    setIsAdmin(userData.isAdmin || false);
    setIsApproved(userData.isApproved || false);
    setIsActive(userData.isActive || false);
  }, [userData]);

  // Fetch all possible positions from metadata
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const docSnap = await getDoc(doc(db, "metadata", "positions"));
        if (docSnap.exists()) setAvailablePositions(docSnap.data().list || []);
      } catch (e) {
        console.error("Error fetching positions:", e);
      }
    };
    fetchPositions();
  }, []);

  const handleSave = async () => {
    if (!uid) return;

    setStatus("saving");
    try {
      // Security Logic: Primary Admin must always be Admin and Approved
      const finalIsAdmin = isPrimaryAdmin ? true : isAdmin;
      const finalIsApproved = isPrimaryAdmin ? true : isApproved;

      const updateData: any = {
        gender,
        positions: selectedPositions,
      };

      if (userData.isAdmin) {
        updateData.isAdmin = finalIsAdmin;
        updateData.isApproved = finalIsApproved;
        updateData.isActive = isActive; // Allowed to toggle Active/Inactive
      }

      await updateDoc(doc(db, "users", uid), updateData);

      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      console.error("Save Error:", e);
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
    <div className="settings-container">
      {activeSection === SettingsSection.PROFILE && (
        <section className="profile-card">
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
                        ? {
                            backgroundColor: pos.colour,
                            borderColor: pos.colour,
                          }
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
                    onClick={() =>
                      !isPrimaryAdmin && setIsApproved(!isApproved)
                    }
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
                  Primary Admin rights are locked via environment variables.
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
      )}

      {activeSection === SettingsSection.USERS && userData.isAdmin && (
        <div className="admin-content">
          <UserManagement />
        </div>
      )}

      {activeSection === SettingsSection.POSITIONS && userData.isAdmin && (
        <div className="admin-content">
          <PositionManager />
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
