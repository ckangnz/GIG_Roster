import { useState, useEffect, useMemo } from "react";

import { Reorder } from "framer-motion";
import { Plus } from "lucide-react";

import NewTeamModal from "./NewTeamModal";
import TeamManagementRow from "./TeamManagementRow";
import Button from "../../components/common/Button";
import SaveFooter from "../../components/common/SaveFooter";
import SettingsTable from "../../components/common/SettingsTable";
import Spinner from "../../components/common/Spinner";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Position, RecurringEvent, Team, Weekday } from "../../model/model";
import { updateTeams } from "../../store/slices/teamsSlice";
import { showAlert } from "../../store/slices/uiSlice";

import styles from "./settings-page.module.css";

const TeamManagement = () => {
  const dispatch = useAppDispatch();
  const { teams: reduxTeams, loading: teamsLoading } = useAppSelector(
    (state) => state.teams,
  );
  const { positions: availablePositions, loading: positionsLoading } =
    useAppSelector((state) => state.positions);

  const [teams, setTeams] = useState<Team[]>(reduxTeams);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState("idle");

  const hasChanges = useMemo(() => {
    const normalize = (list: Team[]) =>
      list.map((t) => ({
        name: t.name || "",
        emoji: t.emoji || "",
        positions: (t.positions || []).map((p) => p.name).sort(),
        preferredDays: [...(t.preferredDays || [])].sort(),
        maxConflict: t.maxConflict || 1,
        allowAbsence: t.allowAbsence !== false,
        dayEndTimes: t.dayEndTimes || {},
        recurringEvents: (t.recurringEvents || []).map(ev => ({
          label: ev.label,
          day: ev.day,
          startTime: ev.startTime,
          endTime: ev.endTime
        }))
      }));
    return (
      JSON.stringify(normalize(teams)) !== JSON.stringify(normalize(reduxTeams))
    );
  }, [teams, reduxTeams]);

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

  const toggleAllowAbsence = (teamIndex: number, allow: boolean) => {
    const updatedTeams = teams.map((team, index) => {
      if (index !== teamIndex) return team;
      return { ...team, allowAbsence: allow };
    });
    setTeams(updatedTeams);
  };

  const handleUpdateEvents = (index: number, events: RecurringEvent[]) => {
    const updated = [...teams];
    updated[index] = { ...updated[index], recurringEvents: events };
    setTeams(updated);
  };

  const handleUpdateDayEndTime = (index: number, day: Weekday, time: string) => {
    const updated = [...teams];
    const currentEndTimes = updated[index].dayEndTimes || {};
    updated[index] = { 
      ...updated[index], 
      dayEndTimes: { ...currentEndTimes, [day]: time } 
    };
    setTeams(updated);
  };

  const addTeam = (newTeam: Team) => {
    setTeams([...teams, newTeam]);
  };

  const deleteTeam = (index: number) => {
    dispatch(showAlert({
      title: "Delete Team",
      message: "Are you sure you want to delete this team?",
      confirmText: "Delete",
      onConfirm: () => {
        setTeams(teams.filter((_, i) => i !== index));
      }
    }));
  };

  const saveToFirebase = async () => {
    setStatus("saving");
    try {
      const teamsToSave: Team[] = teams.map((t) => ({
        id: t.id || t.name,
        name: t.name || "",
        emoji: t.emoji || "",
        maxConflict: t.maxConflict || 1,
        allowAbsence: t.allowAbsence !== false, // Default to true
        preferredDays: t.preferredDays || [],
        dayEndTimes: t.dayEndTimes || {},
        recurringEvents: t.recurringEvents || [],
        positions: (t.positions || []).map((p) => ({
          id: p.id || p.name,
          name: p.name || "",
          emoji: p.emoji || "",
          colour: p.colour || "",
          sortByGender: !!p.sortByGender,
          isCustom: !!p.isCustom,
          customLabels: p.customLabels || [],
          ...(p.parentId ? { parentId: p.parentId } : {}),
        })),
      }));
      await dispatch(updateTeams(teamsToSave)).unwrap();
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      console.error("Save Error:", e);
      dispatch(showAlert({
        title: "Save Error",
        message: "Error saving: " + (e instanceof Error ? e.message : "Unknown error"),
        showCancel: false
      }));
      setStatus("idle");
    }
  };

  const handleCancel = () => {
    setTeams(reduxTeams);
  };

  if (teamsLoading || positionsLoading) {
    return <Spinner />;
  }

  return (
    <div className={styles.managementWrapper}>
      <SettingsTable
        headers={[
          {
            text: "Name",
            minWidth: 150,
            width: 250,
            textAlign: "center",
          },
          { text: "Emoji", width: 30, textAlign: "center" },
          { text: "Max Pos", width: 60, textAlign: "center" },
          { text: "Config", minWidth: 180, textAlign: "center" },
          { text: "", width: 50 },
        ]}
        customBody={
          <Reorder.Group axis="y" values={teams} onReorder={setTeams} as="tbody">
            {teams.map((team, teamIndex) => (
              <TeamManagementRow
                key={`${team.emoji}-${team.name}`}
                team={team}
                teamIndex={teamIndex}
                availablePositions={availablePositions}
                onUpdate={handleUpdate}
                onDelete={deleteTeam}
                onTogglePosition={togglePosition}
                onToggleDay={toggleDay}
                onToggleAllowAbsence={toggleAllowAbsence}
                onUpdateEvents={handleUpdateEvents}
                onUpdateDayEndTime={handleUpdateDayEndTime}
              />
            ))}
          </Reorder.Group>
        }
      >
        {null}
      </SettingsTable>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} style={{ marginRight: "8px" }} />
          New Team
        </Button>
      </div>

      <NewTeamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={addTeam}
        availablePositions={availablePositions}
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
