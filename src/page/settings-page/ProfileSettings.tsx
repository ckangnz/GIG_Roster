import { useState, useMemo, useEffect } from "react";

import TeamPositionEditor from "./TeamPositionEditor";
import Button from "../../components/common/Button";
import Pill, { PillGroup } from "../../components/common/Pill";
import SaveFooter from "../../components/common/SaveFooter";
import { auth } from "../../firebase";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { updateUserProfile } from "../../store/slices/authSlice";
import { fetchPositions } from "../../store/slices/positionsSlice";
import { fetchTeams } from "../../store/slices/teamsSlice";
import formStyles from "../../styles/form.module.css";

import styles from "./profile-settings.module.css";

const ProfileSettings = ({ className }: { className?: string }) => {
  const dispatch = useAppDispatch();
  const { userData, firebaseUser } = useAppSelector((state) => state.auth);
  const { teams: availableTeams, fetched: teamsFetched } = useAppSelector(
    (state) => state.teams,
  );
  const { positions: globalPositions, fetched: positionsFetched } =
    useAppSelector((state) => state.positions);

  const [name, setName] = useState(userData?.name || "");
  const [gender, setGender] = useState(userData?.gender || "");
  const [isActive, setIsActive] = useState(userData?.isActive ?? true);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(
    userData?.teams || [],
  );
  const [teamPositions, setTeamPositions] = useState<Record<string, string[]>>(
    userData?.teamPositions || {},
  );
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!teamsFetched) {
      dispatch(fetchTeams());
    }
    if (!positionsFetched) {
      dispatch(fetchPositions());
    }
  }, [dispatch, teamsFetched, positionsFetched]);

  const hasChanges = useMemo(() => {
    if (!userData) return false;
    const currentData = {
      name,
      gender,
      isActive,
      teams: selectedTeams,
      teamPositions,
    };
    const originalData = {
      name: userData.name || "",
      gender: userData.gender || "",
      isActive: userData.isActive ?? true,
      teams: userData.teams || [],
      teamPositions: userData.teamPositions || {},
    };
    return JSON.stringify(currentData) !== JSON.stringify(originalData);
  }, [name, gender, isActive, selectedTeams, teamPositions, userData]);

  const handleSave = async () => {
    if (!firebaseUser) return;
    setStatus("saving");
    try {
      const updateData = {
        name,
        gender,
        isActive,
        teams: selectedTeams,
        teamPositions,
      };
      await dispatch(
        updateUserProfile({ uid: firebaseUser.uid, data: updateData }),
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
    setName(userData.name || "");
    setGender(userData.gender || "");
    setIsActive(userData.isActive ?? true);
    setSelectedTeams(userData.teams || []);
    setTeamPositions(userData.teamPositions || {});
  };

  const toggleTeam = (teamName: string) => {
    setSelectedTeams((prev) => {
      const isRemoving = prev.includes(teamName);
      const newTeams = isRemoving
        ? prev.filter((name) => name !== teamName)
        : [...prev, teamName];

      setTeamPositions((prevTP) => {
        const nextTP = { ...prevTP };
        if (isRemoving) {
          delete nextTP[teamName];
        } else if (!nextTP[teamName]) {
          nextTP[teamName] = [];
        }
        return nextTP;
      });

      return newTeams;
    });
  };

  const toggleTeamPosition = (teamName: string, posName: string) => {
    setTeamPositions((prev) => {
      const current = prev[teamName] || [];
      const updated = current.includes(posName)
        ? current.filter((p) => p !== posName)
        : [...current, posName];
      return { ...prev, [teamName]: updated };
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
          value={name}
          onChange={(e) => setName(e.target.value)}
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
              onClick={() => setGender(g.value)}
              isActive={gender === g.value}
            >
              {g.value}
            </Pill>
          ))}
        </PillGroup>
      </div>

      <TeamPositionEditor
        selectedTeams={selectedTeams}
        teamPositions={teamPositions}
        onToggleTeam={toggleTeam}
        onTogglePosition={toggleTeamPosition}
        availableTeams={availableTeams}
        globalPositions={globalPositions}
      />

      <div className={formStyles.formGroup}>
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
