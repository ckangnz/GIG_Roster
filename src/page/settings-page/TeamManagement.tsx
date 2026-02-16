import { useState, useEffect, useMemo } from "react";

import TeamEditModal from "./TeamEditModal";
import TeamManagementRow from "./TeamManagementRow";
import SaveFooter from "../../components/common/SaveFooter";
import SettingsTable, {
  SettingsTableAnyCell,
  SettingsTableInputCell,
} from "../../components/common/SettingsTable";
import Spinner from "../../components/common/Spinner";
import SummaryCell from "../../components/common/SummaryCell";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Position, Team, Weekday } from "../../model/model";
import { fetchPositions } from "../../store/slices/positionsSlice";
import { fetchTeams, updateTeams } from "../../store/slices/teamsSlice";

import styles from "./settings-page.module.css";

const defaultTeam: Team = {
  name: "",
  emoji: "",
  positions: [],
  preferredDays: [],
  maxConflict: 1,
};

const TeamManagement = () => {
  const dispatch = useAppDispatch();
  const {
    teams: reduxTeams,
    fetched: teamsFetched,
    loading: teamsLoading,
  } = useAppSelector((state) => state.teams);
  const {
    positions: availablePositions,
    fetched: positionsFetched,
    loading: positionsLoading,
  } = useAppSelector((state) => state.positions);

  const [teams, setTeams] = useState<Team[]>(reduxTeams);
  const [newTeam, setNewTeam] = useState<Team>(defaultTeam);
  const [status, setStatus] = useState("idle");
  const [isNewTeamModalOpen, setIsNewTeamModalOpen] = useState(false);

  const hasChanges = useMemo(() => {
    return JSON.stringify(teams) !== JSON.stringify(reduxTeams);
  }, [teams, reduxTeams]);

  useEffect(() => {
    if (!teamsFetched) {
      dispatch(fetchTeams());
    }
    if (!positionsFetched) {
      dispatch(fetchPositions());
    }
  }, [dispatch, teamsFetched, positionsFetched]);

  useEffect(() => {
    setTeams(reduxTeams);
  }, [reduxTeams]);

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

  const toggleNewTeamPosition = (pos: Position) => {
    const currentPositions = newTeam.positions || [];
    const newPositions = currentPositions.some((p) => p.name === pos.name)
      ? currentPositions.filter((p) => p.name !== pos.name)
      : [...currentPositions, pos];
    setNewTeam({ ...newTeam, positions: newPositions });
  };

  const toggleNewTeamDay = (day: Weekday) => {
    const currentDays = newTeam.preferredDays || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];
    setNewTeam({ ...newTeam, preferredDays: newDays });
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
      await dispatch(updateTeams(teams)).unwrap();
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

  const handleCancel = () => {
    setTeams(reduxTeams);
  };

  if (teamsLoading || positionsLoading) {
    return <Spinner />;
  }

  const getNewTeamPositionsSummary = () => {
    if (!newTeam.positions || newTeam.positions.length === 0)
      return "No positions";
    return newTeam.positions.map((p) => p.emoji).join(" ");
  };

  const getNewTeamDaysSummary = () => {
    if (!newTeam.preferredDays || newTeam.preferredDays.length === 0)
      return "No days";
    return newTeam.preferredDays.map((d) => d.substring(0, 3)).join(", ");
  };

  return (
    <div className={styles.managementWrapper}>
      <SettingsTable
        headers={[
          { text: "Name", minWidth: 100, isSticky: true },
          { text: "Order", minWidth: 50, textAlign: "center" },
          { text: "Emoji", width: 30 },
          { text: "Conflicts", width: 60, textAlign: "center" },
          { text: "Config", minWidth: 150 },
          { text: "", width: 50 },
        ]}
      >
        {teams.map((team, teamIndex) => (
          <TeamManagementRow
            key={`${team.emoji}-${teamIndex}`}
            team={team}
            teamIndex={teamIndex}
            availablePositions={availablePositions}
            onUpdate={handleUpdate}
            onMove={move}
            onDelete={deleteTeam}
            onTogglePosition={togglePosition}
            onToggleDay={toggleDay}
            isFirst={teamIndex === 0}
            isLast={teamIndex === teams.length - 1}
          />
        ))}
        <tr className="team-row-new">
          <SettingsTableInputCell
            name={`new-team-name`}
            value={newTeam.name}
            placeholder="Team Name"
            onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
            isSticky
          />
          <SettingsTableAnyCell>{""}</SettingsTableAnyCell>
          <SettingsTableInputCell
            name={`new-team-emoji`}
            value={newTeam.emoji}
            placeholder="✨"
            onChange={(e) => setNewTeam({ ...newTeam, emoji: e.target.value })}
          />
          <SettingsTableInputCell
            name={`new-team-maxConflict`}
            value={newTeam.maxConflict?.toString() || "1"}
            type="number"
            onChange={(e) =>
              setNewTeam({
                ...newTeam,
                maxConflict: parseInt(e.target.value) || 1,
              })
            }
          />
          <SettingsTableAnyCell>
            <SummaryCell
              primaryText={getNewTeamPositionsSummary()}
              secondaryText={getNewTeamDaysSummary()}
              onClick={() => setIsNewTeamModalOpen(true)}
            />
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

      <TeamEditModal
        isOpen={isNewTeamModalOpen}
        onClose={() => setIsNewTeamModalOpen(false)}
        team={newTeam}
        availablePositions={availablePositions}
        onTogglePosition={toggleNewTeamPosition}
        onToggleDay={toggleNewTeamDay}
      />

      {hasChanges && (
        <SaveFooter
          label="Unsaved team changes"
          saveText="Save All Team Changes"
          onSave={saveToFirebase}
          onCancel={handleCancel}
          isSaving={status === "saving"}
        />
      )}
    </div>
  );
};

export default TeamManagement;
