import { useState, useMemo, useEffect } from "react";

import TeamPositionEditor from "./TeamPositionEditor";
import Button from "../../components/common/Button";
import Pill, { PillGroup } from "../../components/common/Pill";
import SaveFooter from "../../components/common/SaveFooter";
import { auth } from "../../firebase";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { updateUserProfile } from "../../store/slices/authSlice";
import formStyles from "../../styles/form.module.css";

import styles from "./profile-settings.module.css";

const ProfileSettings = ({ className }: { className?: string }) => {
  const dispatch = useAppDispatch();
  const { userData, firebaseUser } = useAppSelector((state) => state.auth);
  const { teams: availableTeams } = useAppSelector((state) => state.teams);
  const { positions: globalPositions } = useAppSelector(
    (state) => state.positions,
  );

  const [formState, setFormState] = useState({
    name: "",
    gender: "",
    isActive: true,
    teams: [] as string[],
    teamPositions: {} as Record<string, string[]>,
  });

  const [status, setStatus] = useState("idle");

  // Initial and real-time sync from Redux
  useEffect(() => {
    if (!userData || status === "saving") return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormState((prev) => {
      const isDirty =
        prev.name !== (userData.name || "") ||
        prev.gender !== (userData.gender || "") ||
        prev.isActive !== (userData.isActive ?? true) ||
        JSON.stringify(prev.teams) !== JSON.stringify(userData.teams || []) ||
        JSON.stringify(prev.teamPositions) !==
          JSON.stringify(userData.teamPositions || {});

      // Only sync if we haven't drifted from the server
      // OR if this is the first load
      if (!isDirty || status === "idle") {
        return {
          name: userData.name || "",
          gender: userData.gender || "",
          isActive: userData.isActive ?? true,
          teams: userData.teams || [],
          teamPositions: userData.teamPositions || {},
        };
      }
      return prev;
    });
  }, [userData, status]);

  const hasChanges = useMemo(() => {
    if (!userData) return false;
    const originalData = {
      name: userData.name || "",
      gender: userData.gender || "",
      isActive: userData.isActive ?? true,
      teams: userData.teams || [],
      teamPositions: userData.teamPositions || {},
    };
    return JSON.stringify(formState) !== JSON.stringify(originalData);
  }, [formState, userData]);

  const handleSave = async () => {
    if (!firebaseUser) return;
    setStatus("saving");
    try {
      await dispatch(
        updateUserProfile({ uid: firebaseUser.uid, data: formState }),
      ).unwrap();
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      console.error(e);
      setStatus("idle");
    }
  };

  const handleCancel = () => {
    if (!userData) return;
    setFormState({
      name: userData.name || "",
      gender: userData.gender || "",
      isActive: userData.isActive ?? true,
      teams: userData.teams || [],
      teamPositions: userData.teamPositions || {},
    });
  };

  const toggleTeam = (teamName: string) => {
    setFormState((prev) => {
      const isRemoving = prev.teams.includes(teamName);
      const newTeams = isRemoving
        ? prev.teams.filter((name) => name !== teamName)
        : [...prev.teams, teamName];

      const newTP = { ...prev.teamPositions };
      if (isRemoving) {
        delete newTP[teamName];
      } else if (!newTP[teamName]) {
        newTP[teamName] = [];
      }

      return { ...prev, teams: newTeams, teamPositions: newTP };
    });
  };

  const toggleTeamPosition = (teamName: string, posName: string) => {
    setFormState((prev) => {
      const current = prev.teamPositions[teamName] || [];
      const updated = current.includes(posName)
        ? current.filter((p) => p !== posName)
        : [...current, posName];
      return {
        ...prev,
        teamPositions: { ...prev.teamPositions, [teamName]: updated },
      };
    });
  };

  const moveTeam = (teamName: string, direction: "up" | "down") => {
    setFormState((prev) => {
      const currentIndex = prev.teams.indexOf(teamName);
      if (currentIndex === -1) return prev;

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.teams.length) return prev;

      const newTeams = [...prev.teams];
      [newTeams[currentIndex], newTeams[targetIndex]] = [
        newTeams[targetIndex],
        newTeams[currentIndex],
      ];
      return { ...prev, teams: newTeams };
    });
  };

  if (!userData) {
    return <div>Loading profile...</div>;
  }

  return (
    <section className={`${styles.profileCard} ${className || ""}`}>
      <div className={styles.profileReadonly}>
        <p>
          <strong>Email:</strong> {userData.email}
        </p>
      </div>

      <div className={formStyles.formGroup}>
        <label>Name</label>
        <input
          type="text"
          value={formState.name}
          onChange={(e) =>
            setFormState((prev) => ({ ...prev, name: e.target.value }))
          }
          className={formStyles.formInput}
        />
      </div>
      <div className={formStyles.formGroup}>
        <label>Gender</label>
        <PillGroup>
          {[
            { value: "Male", colour: "var(--color-male)" },
            { value: "Female", colour: "var(--color-female)" },
          ].map((g: { value: string; colour: string }) => (
            <Pill
              key={g.value}
              colour={g.colour}
              onClick={() =>
                setFormState((prev) => ({ ...prev, gender: g.value }))
              }
              isActive={formState.gender === g.value}
            >
              {g.value}
            </Pill>
          ))}
        </PillGroup>
      </div>

      <TeamPositionEditor
        selectedTeams={formState.teams}
        teamPositions={formState.teamPositions}
        onToggleTeam={toggleTeam}
        onTogglePosition={toggleTeamPosition}
        onMoveTeam={moveTeam}
        availableTeams={availableTeams}
        globalPositions={globalPositions}
      />

      <div className={formStyles.formGroup}>
        <label>Availability Status</label>
        <Pill
          colour={
            formState.isActive
              ? "var(--color-success-dark)"
              : "var(--color-warning-dark)"
          }
          onClick={() =>
            setFormState((prev) => ({ ...prev, isActive: !prev.isActive }))
          }
          isActive
        >
          {formState.isActive ? "ACTIVE & AVAILABLE" : "INACTIVE / AWAY"}
        </Pill>
        <p className={formStyles.fieldHint}>
          Turn off if you want to be hidden from the roster.
        </p>
      </div>

      <div className={styles.actionContainer}>
        <Button variant="delete" onClick={() => auth.signOut()}>
          Logout
        </Button>
      </div>

      {hasChanges && (
        <SaveFooter
          label="Unsaved profile changes"
          saveText="Update Profile"
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={status === "saving"}
        />
      )}
    </section>
  );
};

export default ProfileSettings;
