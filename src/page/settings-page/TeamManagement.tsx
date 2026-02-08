import { useEffect, useState } from "react";

import { doc, getDoc, updateDoc } from "firebase/firestore";

import Pill, { PillGroup } from "../../components/common/Pill";
import SettingsTable, {
  SettingsTableAnyCell,
  SettingsTableInputCell,
} from "../../components/common/SettingsTable";
import { db } from "../../firebase";
import { Position, Team, Weekday } from "../../model/model";

const defaultTeam: Team = {
  id: "",
  name: "",
  emoji: "",
  positions: [],
  preferredDays: [],
};

const WEEK_DAYS: Weekday[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TeamManagement = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [newTeam, setNewTeam] = useState<Team>(defaultTeam);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const fetchData = async () => {
      let fetchedAvailablePositions: Position[] = [];
      try {
        const posDocRef = doc(db, "metadata", "positions");
        const posSnap = await getDoc(posDocRef);
        if (posSnap.exists()) {
          const data = posSnap.data();
          fetchedAvailablePositions = Array.isArray(data.list) ? data.list : [];
          setAvailablePositions(fetchedAvailablePositions);
        }
      } catch (error) {
        console.error("Error fetching positions:", error);
      }

      try {
        const teamsDocRef = doc(db, "metadata", "teams");
        const teamsSnap = await getDoc(teamsDocRef);
        if (teamsSnap.exists()) {
          const data = teamsSnap.data();
          setTeams(
            Array.isArray(data.list)
              ? data.list.map((teamData: Team) => {
                  const team: Team = {
                    ...teamData,
                    preferredDays: teamData.preferredDays || [],
                    positions: Array.isArray(teamData.positions)
                      ? teamData.positions.map((pos: string | Position) => {
                          if (typeof pos === "string") {
                            return (
                              fetchedAvailablePositions.find(
                                (ap) => ap.name === pos,
                              ) || {
                                name: pos,
                                emoji: "❓",
                                colour: "#ccc",
                              }
                            );
                          }
                          return pos;
                        })
                      : [],
                  };
                  return team;
                })
              : [],
          );
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
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

  const move = (index: number, direction: "up" | "down") => {
    const updated = [...teams];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= updated.length) return;

    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;

    setTeams(updated);
  };

  const togglePosition = (teamIndex: number, pos: Position) => {
    const updatedTeams = teams.map((team, index) => {
      if (index !== teamIndex) return team;

      const currentPositions = team.positions || [];
      const newPositions = currentPositions.find((p) => p.name === pos.name)
        ? currentPositions.filter((p) => p.name !== pos.name)
        : [...currentPositions, pos];
      return { ...team, positions: newPositions };
    });
    setTeams(updatedTeams);
  };

  const toggleDay = (teamIndex: number, day: Weekday) => {
    const updatedTeams = teams.map((team, index) => {
      if (index !== teamIndex) return team;

      const currentDays = team.preferredDays || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day];
      return { ...team, preferredDays: newDays };
    });
    setTeams(updatedTeams);
  };

  const addTeam = () => {
    if (!newTeam.name.trim() || !newTeam.emoji.trim()) {
      return alert("Please provide both an emoji and a name for the team.");
    }
    setTeams([...teams, newTeam]);
    setNewTeam(defaultTeam);
  };

  const deleteTeam = (index: number) => {
    if (window.confirm("Are you sure you want to delete this team?")) {
      setTeams(teams.filter((_, i) => i !== index));
    }
  };

  const saveToFirebase = async () => {
    setStatus("saving");
    try {
      const teamsDocRef = doc(db, "metadata", "teams");
      const teamsToSave = teams.map(({ ...rest }) => rest);
      await updateDoc(teamsDocRef, { list: teamsToSave });
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

  return (
    <>
      <SettingsTable
        headers={[
          { text: "Order", minWidth: 50, textAlign: "center" },
          { text: "Emoji", width: 30 },
          { text: "Name", minWidth: 100 },
          { text: "Allowed Positions", minWidth: 200 },
          { text: "Preferred Days", minWidth: 250 },
          { text: "", width: 50 },
        ]}
      >
        {teams.map((team, teamIndex) => (
          <tr key={`${team.emoji}-${teamIndex}`}>
            <SettingsTableAnyCell>
              {" "}
              {/* Added move buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  justifyContent: "center",
                }}
              >
                <button
                  className="icon-button icon-button--small icon-button--secondary"
                  onClick={() => move(teamIndex, "up")}
                  disabled={teamIndex === 0}
                >
                  ▲
                </button>
                <button
                  className="icon-button icon-button--small icon-button--secondary"
                  onClick={() => move(teamIndex, "down")}
                  disabled={teamIndex === teams.length - 1}
                >
                  ▼
                </button>
              </div>
            </SettingsTableAnyCell>
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
                  const isActive = team.positions?.some(
                    (p) => p.name === pos.name,
                  );
                  return (
                    <Pill
                      key={pos.name}
                      colour={pos.colour}
                      isActive={isActive}
                      onClick={() => togglePosition(teamIndex, pos)}
                    >
                      {pos.emoji}
                    </Pill>
                  );
                })}
              </PillGroup>
            </SettingsTableAnyCell>
            <SettingsTableAnyCell>
              <PillGroup nowrap>
                {WEEK_DAYS.map((day) => {
                  const isActive = team.preferredDays?.includes(day);
                  return (
                    <Pill
                      key={day}
                      isActive={isActive}
                      onClick={() => toggleDay(teamIndex, day)}
                    >
                      {day.substring(0, 3)}
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
        <tr className="team-row-new">
          <td className="">{""}</td>
          <SettingsTableInputCell
            name={`new-team-emoji`}
            value={newTeam.emoji}
            placeholder="✨"
            onChange={(e) => setNewTeam({ ...newTeam, emoji: e.target.value })}
          />
          <SettingsTableInputCell
            name={`new-team-name`}
            value={newTeam.name}
            placeholder="Team Name"
            onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
          />
          <SettingsTableAnyCell>
            <PillGroup nowrap>
              {availablePositions.map((pos) => {
                const isActive = newTeam.positions?.some(
                  (p) => p.name === pos.name,
                );
                return (
                  <Pill
                    key={`new-${pos.name}`}
                    colour={pos.colour}
                    isActive={isActive}
                    onClick={() =>
                      setNewTeam((prev) => {
                        const currentPositions = prev.positions || [];
                        const newPositions = currentPositions.some(
                          (p) => p.name === pos.name,
                        )
                          ? currentPositions.filter((p) => p.name !== pos.name)
                          : [...currentPositions, pos];
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
            <PillGroup nowrap>
              {WEEK_DAYS.map((day) => {
                const isActive = newTeam.preferredDays?.includes(day);
                return (
                  <Pill
                    key={`new-team-${day}`}
                    isActive={isActive}
                    onClick={() =>
                      setNewTeam((prev) => {
                        const currentDays = prev.preferredDays || [];
                        const newDays = currentDays.includes(day)
                          ? currentDays.filter((d) => d !== day)
                          : [...currentDays, day];
                        return { ...prev, preferredDays: newDays };
                      })
                    }
                  >
                    {day.substring(0, 3)}
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
