import { useEffect, useState } from "react";

import { doc, getDoc, updateDoc } from "firebase/firestore";

import Pill, { PillGroup } from "../../components/common/Pill";
import SettingsTable, {
  SettingsTableAnyCell,
  SettingsTableInputCell,
} from "../../components/common/SettingsTable";
import { db } from "../../firebase";
import { Position } from "../../model/model";

interface Team {
  id?: string; // Optional, as it might not exist for new teams or before saving
  name: string;
  emoji: string;
  positions: string[]; // Array of position names
}

const defaultTeam: Team = {
  name: "",
  emoji: "",
  positions: [],
};

const TeamManagement = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [newTeam, setNewTeam] = useState<Team>(defaultTeam);
  const [status, setStatus] = useState("idle"); // Changed from isSaving to status

  useEffect(() => {
    const fetchData = async () => {
      // Fetch teams
      try {
        const teamsDocRef = doc(db, "metadata", "teams");
        const teamsSnap = await getDoc(teamsDocRef);
        if (teamsSnap.exists()) {
          const data = teamsSnap.data();
          setTeams(Array.isArray(data.list) ? data.list : []);
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
      }

      // Fetch available positions
      try {
        const posDocRef = doc(db, "metadata", "positions");
        const posSnap = await getDoc(posDocRef);
        if (posSnap.exists()) {
          const data = posSnap.data();
          setAvailablePositions(Array.isArray(data.list) ? data.list : []);
        }
      } catch (error) {
        console.error("Error fetching positions:", error);
      }
    };
    fetchData();
  }, []);

  const handleUpdate = (
    index: number,
    field: keyof Team,
    value: Team[keyof Team],
  ) => {
    const updated = [...teams];
    updated[index] = { ...updated[index], [field]: value };
    setTeams(updated);
  };

  const togglePosition = (teamIndex: number, posName: string) => {
    const updatedTeams = teams.map((team, index) => {
      if (index !== teamIndex) return team;

      const currentPositions = team.positions || [];
      const newPositions = currentPositions.includes(posName)
        ? currentPositions.filter((p) => p !== posName)
        : [...currentPositions, posName];
      return { ...team, positions: newPositions };
    });
    setTeams(updatedTeams);
  };

  const addTeam = () => {
    if (!newTeam.name.trim() || !newTeam.emoji.trim()) {
      return alert("Please provide both an emoji and a name for the team.");
    }
    setTeams([...teams, newTeam]);
    setNewTeam(defaultTeam); // Reset form
  };

  const deleteTeam = (index: number) => {
    if (window.confirm("Are you sure you want to delete this team?")) {
      setTeams(teams.filter((_, i) => i !== index));
    }
  };

  const saveToFirebase = async () => {
    setStatus("saving"); // Set status to saving
    try {
      const teamsDocRef = doc(db, "metadata", "teams");
      const teamsToSave = teams.map(({ ...rest }) => rest);
      await updateDoc(teamsDocRef, { list: teamsToSave });
      setStatus("success"); // Set status to success
      setTimeout(() => setStatus("idle"), 2000); // Reset to idle after 2 seconds
    } catch (e) {
      console.error("Save Error:", e);
      alert(
        "Check Firestore Rules: You may lack permission to write to 'metadata'.",
      );
      setStatus("idle"); // Reset to idle on error
    }
  };

  return (
    <>
      <SettingsTable
        headers={[
          { text: "Emoji", width: 30 },
          { text: "Name", minWidth: 100 },
          { text: "Positions", minWidth: 200 },
          { text: "", width: 50 }, // For delete button
        ]}
      >
        {teams.map((team, teamIndex) => (
          <tr key={`${team.name}-${teamIndex}`}>
            <SettingsTableInputCell
              name={`team-emoji-${teamIndex}`}
              value={team.emoji}
              onChange={(e) => handleUpdate(teamIndex, "emoji", e.target.value)}
            />
            <SettingsTableInputCell
              name={`team-name-${teamIndex}`}
              value={team.name}
              onChange={(e) => handleUpdate(teamIndex, "name", e.target.value)}
            />
            <SettingsTableAnyCell>
              <PillGroup nowrap>
                {availablePositions.map((pos) => {
                  const isActive = team.positions?.includes(pos.name);
                  return (
                    <Pill
                      key={pos.name}
                      colour={pos.colour}
                      isActive={isActive}
                      onClick={() => togglePosition(teamIndex, pos.name)}
                    >
                      {pos.emoji}
                    </Pill>
                  );
                })}
              </PillGroup>
            </SettingsTableAnyCell>
            <SettingsTableAnyCell>
              <button
                className="icon-button icon-button--delete"
                onClick={() => deleteTeam(teamIndex)}
              >
                ×
              </button>
            </SettingsTableAnyCell>
          </tr>
        ))}
        {/* Row for adding a new team */}
        <tr className="team-row-new">
          <SettingsTableInputCell
            name={`new-team-emoji`}
            value={newTeam.emoji}
            placeholder="✨"
            onChange={(e) => setNewTeam({ ...newTeam, emoji: e.target.value })}
          />
          <SettingsTableInputCell
            name={`new-team-name`}
            value={newTeam.name}
            placeholder="New Team Name"
            onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
          />
          <SettingsTableAnyCell>
            <PillGroup nowrap>
              {availablePositions.map((pos) => {
                const isActive = newTeam.positions?.includes(pos.name);
                return (
                  <Pill
                    key={`new-${pos.name}`}
                    colour={pos.colour}
                    isActive={isActive}
                    onClick={() =>
                      setNewTeam((prev) => {
                        const currentPositions = prev.positions || [];
                        const newPositions = currentPositions.includes(pos.name)
                          ? currentPositions.filter((p) => p !== pos.name)
                          : [...currentPositions, pos.name];
                        return { ...prev, positions: newPositions };
                      })
                    }
                  >
                    {pos.emoji}
                  </Pill>
                );
              })}
            </PillGroup>
          </SettingsTableAnyCell>
          <SettingsTableAnyCell>
            <button
              onClick={addTeam}
              className="icon-button icon-button--add"
              disabled={!newTeam.name.trim() || !newTeam.emoji.trim()}
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
              : "Save All Team Changes"}
        </button>
      </div>
    </>
  );
};

export default TeamManagement;
