import { useState } from "react";

import { doc, updateDoc } from "firebase/firestore";

import Pill, { PillGroup } from "../../components/common/Pill";
import { db, auth } from "../../firebase";
import { useAppSelector } from "../../hooks/redux";
import { useComputedPositions } from "../../hooks/useComputedPositions";
import { AppUser } from "../../model/model";

import "./profile-settings.css";

interface ProfileSettingsProps {
  userData: AppUser;
  uid: string;
}

const ProfileSettings = ({ userData, uid }: ProfileSettingsProps) => {
  const [name, setName] = useState(userData.name || "");
  const [gender, setGender] = useState(userData.gender || "");
  const [selectedPositions, setSelectedPositions] = useState<string[]>(
    userData.positions || [],
  );
  const [isActive, setIsActive] = useState(userData.isActive ?? true);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(
    userData.teams || [],
  );
  const [status, setStatus] = useState("idle");

  const availableTeams = useAppSelector((state) => state.teams.teams);
  const computedPositions = useComputedPositions(selectedTeams, availableTeams);

  const handleSave = async () => {
    if (!uid) return;
    setStatus("saving");
    try {
      const updateData = {
        name,
        gender,
        positions: selectedPositions,
        isActive,
        teams: selectedTeams,
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

  const toggleTeam = (teamName: string) => {
    setSelectedTeams((prev) =>
      prev.includes(teamName)
        ? prev.filter((name) => name !== teamName)
        : [...prev, teamName],
    );
  };

  return (
    <section className="profile-card">
      <div className="profile-readonly">
        <p>
          <strong>Email:</strong> {userData.email}
        </p>
      </div>

      <div className="form-group">
        <label>Name</label>
        <PillGroup>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input form-input-width-auto"
          />
        </PillGroup>
      </div>
      <div className="form-group">
        <label>Gender</label>
        <PillGroup>
          {[
            { value: "Male", colour: "var(--color-male)" },
            { value: "Female", colour: "var(--color-female)" },
          ].map((g: { value: string; colour: string; }) => (
            <Pill
              key={g.value}
              colour={g.colour}
              onClick={() => setGender(g.value)}
              isActive={gender === g.value}
            >
              {g.value}
            </Pill>
          ))}
        </PillGroup>
      </div>

      <div className="form-group">
        <label>My Teams</label>
        <PillGroup>
          {availableTeams.map((team) => {
            const isSelected = selectedTeams.includes(team.name);
            return (
              <Pill
                key={team.name}
                onClick={() => toggleTeam(team.name)}
                isActive={isSelected}
              >
                <span>{team.emoji}</span> {team.name}
              </Pill>
            );
          })}
        </PillGroup>
      </div>

      <div className="form-group">
        <label>My Positions</label>
        <PillGroup>
          {computedPositions.map((pos) => {
            const isSelected = selectedPositions.includes(pos.name);
            return (
              <Pill
                key={pos.name}
                onClick={() => togglePosition(pos.name)}
                isActive={isSelected}
                colour={pos.colour}
              >
                <span>{pos.emoji}</span> {pos.name}
              </Pill>
            );
          })}
        </PillGroup>
      </div>

      <div className="form-group">
        <label>Availability Status</label>
        <Pill
          colour={
            isActive ? "var(--color-success-dark)" : "var(--color-warning-dark)"
          }
          onClick={() => setIsActive(!isActive)}
          isActive
        >
          {isActive ? "ACTIVE & AVAILABLE" : "INACTIVE / AWAY"}
        </Pill>
        <p className="form-field-hint">
          Turn off if you want to be hidden from the roster.
        </p>
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
