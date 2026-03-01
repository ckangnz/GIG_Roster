import { useState, useEffect, useMemo, useCallback } from "react";


import { Reorder } from "framer-motion";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import TeamConfigModal from "./TeamConfigModal";
import TeamManagementRow from "./TeamManagementRow";
import Button from "../../components/common/Button";
import SaveFooter from "../../components/common/SaveFooter";
import SettingsTable from "../../components/common/SettingsTable";
import Spinner from "../../components/common/Spinner";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { Team } from "../../model/model";
import { updateTeams } from "../../store/slices/teamsSlice";
import { showAlert } from "../../store/slices/uiSlice";
import { cleanupUsersAfterDeletion } from "../../store/slices/userManagementSlice";

import styles from "./settings-page.module.css";

const TeamManagement = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { userData } = useAppSelector((state) => state.auth);
  const orgId = userData?.orgId;

  const teamsState = useAppSelector((state) => state.teams);
  const reduxTeams = useMemo(() => 
    (teamsState?.teams || []).filter(t => t.orgId === orgId), 
  [teamsState?.teams, orgId]);
  
  const { positions: allPositions, loading: positionsLoading } =
    useAppSelector((state) => state.positions);
    
  const availablePositions = useMemo(() => 
    allPositions.filter(p => p.orgId === orgId), 
  [allPositions, orgId]);

  const [teams, setTeams] = useState<Team[]>(reduxTeams);
  const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
  const [isNewTeamModalOpen, setIsNewTeamModalOpen] = useState(false);
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

  const handleApplyTeamConfig = (updatedTeam: Team) => {
    if (editingTeamIndex !== null) {
      setTeams(prev => {
        const updated = [...prev];
        updated[editingTeamIndex] = updatedTeam;
        return updated;
      });
    } else {
      setTeams(prev => [...prev, updatedTeam]);
    }
  };

  const deleteTeam = (index: number) => {
    dispatch(showAlert({
      title: t('management.team.deleteTitle'),
      message: t('management.team.deleteConfirm'),
      confirmText: t('common.delete'),
      onConfirm: () => {
        setTeams(teams.filter((_, i) => i !== index));
      }
    }));
  };

  const saveToFirebase = async () => {
    setStatus("saving");
    try {
      if (!orgId) throw new Error("Org ID missing");
      // 1. Identify which teams are being removed
      const currentIds = new Set(teams.map(t => t.id));
      const deletedTeams = reduxTeams.filter(t => !currentIds.has(t.id));

      const teamsToSave: Team[] = teams.map((t) => ({
        id: t.id,
        orgId: t.orgId || orgId, // Ensure orgId is present
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

  if (teamsState?.loading || positionsLoading) {
    return <Spinner />;
  }

  return (
    <div className={styles.managementWrapper}>
      <SettingsTable
        headers={[
          {
            text: t('management.team.name'),
            minWidth: 150,
            width: 250,
            textAlign: "center",
          },
          { text: t('management.team.emoji'), width: 30, textAlign: "center" },
          { text: t('management.team.maxPos'), width: 60, textAlign: "center" },
          { text: t('management.team.config'), minWidth: 180, textAlign: "center" },
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
                onEdit={(idx) => setEditingTeamIndex(idx)}
              />
            ))}
          </Reorder.Group>
        }
      >
        {null}
      </SettingsTable>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="primary" onClick={() => setIsNewTeamModalOpen(true)}>
          <Plus size={18} style={{ marginRight: "8px" }} />
          {t('management.team.newTeam')}
        </Button>
      </div>

      <TeamConfigModal
        isOpen={isNewTeamModalOpen || editingTeamIndex !== null}
        onClose={() => {
          setIsNewTeamModalOpen(false);
          setEditingTeamIndex(null);
        }}
        team={editingTeamIndex !== null ? teams[editingTeamIndex] : null}
        onSave={handleApplyTeamConfig}
        availablePositions={availablePositions}
      />

      {hasChanges && (
        <SaveFooter
          label={t('management.team.unsavedChanges')}
          saveText={t('management.team.saveAll')}
          onSave={() => saveToFirebase()}
          onCancel={handleCancel}
          isSaving={status === "saving"}
        />
      )}
    </div>
  );
};

export default TeamManagement;
