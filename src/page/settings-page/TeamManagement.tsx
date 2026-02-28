import { useState, useEffect, useMemo, useCallback } from "react";

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
import { cleanupUsersAfterDeletion } from "../../store/slices/userManagementSlice";

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
        id: t.id,
        name: t.name || "",
        emoji: t.emoji || "",
        positions: [...(t.positions || [])].sort(),
        preferredDays: [...(t.preferredDays || [])].sort(),
        maxConflict: t.maxConflict || 1,
        allowAbsence: t.allowAbsence !== false,
        dayEndTimes: t.dayEndTimes || {},
        rosterMode: t.rosterMode || "daily",
        slots: [...(t.slots || [])].map(s => ({ id: s.id, label: s.label, startTime: s.startTime, endTime: s.endTime })),
        recurringEvents: (t.recurringEvents || []).map(ev => ({
          id: ev.id,
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

  const handleUpdate = useCallback((
    index: number,
    field: keyof Team,
    value: Team[keyof Team],
  ) => {
    setTeams(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const togglePosition = useCallback((teamIndex: number, pos: Position) => {
    setTeams(prev => prev.map((team, index) => {
      if (index !== teamIndex) return team;

      const currentPositionIds = team.positions || [];
      const newPositionIds = currentPositionIds.includes(pos.id)
        ? currentPositionIds.filter((id) => id !== pos.id)
        : [...currentPositionIds, pos.id];
      return { ...team, positions: newPositionIds };
    }));
  }, []);

  const toggleDay = useCallback((teamIndex: number, day: Weekday) => {
    setTeams(prev => prev.map((team, index) => {
      if (index !== teamIndex) return team;

      const currentDays = team.preferredDays || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day];
      return { ...team, preferredDays: newDays };
    }));
  }, []);

  const toggleAllowAbsence = useCallback((teamIndex: number, allow: boolean) => {
    setTeams(prev => prev.map((team, index) => {
      if (index !== teamIndex) return team;
      return { ...team, allowAbsence: allow };
    }));
  }, []);

  const handleUpdateEvents = useCallback((index: number, events: RecurringEvent[]) => {
    setTeams(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], recurringEvents: events };
      return updated;
    });
  }, []);

  const handleUpdateDayEndTime = useCallback((index: number, day: Weekday, time: string) => {
    setTeams(prev => {
      const updated = [...prev];
      const currentEndTimes = updated[index].dayEndTimes || {};
      updated[index] = { 
        ...updated[index], 
        dayEndTimes: { ...currentEndTimes, [day]: time } 
      };
      return updated;
    });
  }, []);

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
      // 1. Identify which teams are being removed
      const currentIds = new Set(teams.map(t => t.id));
      const deletedTeams = reduxTeams.filter(t => !currentIds.has(t.id));

      const teamsToSave: Team[] = teams.map((t) => ({
        id: t.id,
        name: t.name || "",
        emoji: t.emoji || "",
        maxConflict: t.maxConflict || 1,
        allowAbsence: t.allowAbsence !== false,
        preferredDays: t.preferredDays || [],
        dayEndTimes: t.dayEndTimes || {},
        recurringEvents: t.recurringEvents || [],
        positions: t.positions || [],
        rosterMode: t.rosterMode || "daily",
        slots: t.slots || [],
      }));
      await dispatch(updateTeams(teamsToSave)).unwrap();

      // 2. Cleanup users for deleted teams
      for (const team of deletedTeams) {
        await dispatch(cleanupUsersAfterDeletion({ 
          teamId: team.id,
          teamName: team.name
        })).unwrap();
      }

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
                key={team.id}
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
                onUpdateField={(field, val) => handleUpdate(teamIndex, field, val)}
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
          onSave={() => saveToFirebase()}
          onCancel={handleCancel}
          isSaving={status === "saving"}
        />
      )}
    </div>
  );
};

export default TeamManagement;
