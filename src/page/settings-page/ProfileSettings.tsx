import { useState, useMemo, useEffect } from "react";

import TeamPositionEditor from "./TeamPositionEditor";
import Button from "../../components/common/Button";
import Pill, { PillGroup } from "../../components/common/Pill";
import SaveFooter from "../../components/common/SaveFooter";
import Toggle from "../../components/common/Toggle";
import { auth } from "../../firebase";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { updateUserProfile } from "../../store/slices/authSlice";
import formStyles from "../../styles/form.module.css";

import styles from "./profile-settings.module.css";

const ProfileSettings = ({ 
  className, 
  showExtendedInfo = true 
}: { 
  className?: string; 
  showExtendedInfo?: boolean 
}) => {
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

  const isLocked = !userData?.isApproved && !!userData?.name;

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

  const handleWithdraw = async () => {
    if (!firebaseUser) return;
    setStatus("saving");
    try {
      // Clearing the name and gender unlocks the profile
      await dispatch(
        updateUserProfile({ 
          uid: firebaseUser.uid, 
          data: { ...formState, name: "", gender: "" } 
        }),
      ).unwrap();
      setStatus("idle");
    } catch (e) {
      console.error(e);
      setStatus("idle");
    }
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
          disabled={isLocked}
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
              onClick={() => {
                if (!isLocked) {
                  setFormState((prev) => ({ ...prev, gender: g.value }));
                }
              }}
              isActive={formState.gender === g.value}
              isDisabled={isLocked}
            >
              {g.value}
            </Pill>
          ))}
        </PillGroup>
      </div>

      {showExtendedInfo && (
        <>
          {userData.isApproved ? (
            <TeamPositionEditor
              selectedTeams={formState.teams}
              teamPositions={formState.teamPositions}
              onToggleTeam={toggleTeam}
              onTogglePosition={toggleTeamPosition}
              onReorderTeams={(newOrder) =>
                setFormState((prev) => ({ ...prev, teams: newOrder }))
              }
              availableTeams={availableTeams}
              globalPositions={globalPositions}
            />
          ) : (
            <div className={styles.approvalNotice}>
              <p>
                Your account is pending approval. Once approved by an administrator, 
                you will be able to select your teams and positions.
              </p>
            </div>
          )}
        </>
      )}

      {!isLocked && (
        <div className={formStyles.formGroup} style={{ marginTop: "24px" }}>
          <label>Availability Status</label>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                fontSize: "0.95rem",
                color: "var(--color-text-secondary)",
              }}
            >
              {formState.isActive ? "ACTIVE & AVAILABLE" : "INACTIVE / AWAY"}
            </span>
            <Toggle
              isOn={formState.isActive}
              onToggle={(isOn) =>
                setFormState((prev) => ({ ...prev, isActive: isOn }))
              }
            />
          </div>
          <p className={formStyles.fieldHint}>
            Turn off if you want to be hidden from the roster.
          </p>
        </div>
      )}

      {isLocked && (
        <div className={styles.lockedStatusContainer}>
          <div className={styles.lockedBadge}>
            <span className={styles.lockedPulse} />
            Application Submitted
          </div>
          <p className={styles.lockedHint}>
            Your profile is currently being reviewed. You will receive access once approved by an administrator.
          </p>
          <button 
            className={styles.withdrawBtn} 
            onClick={handleWithdraw}
            disabled={status === "saving"}
          >
            Withdraw & Edit Profile
          </button>
        </div>
      )}

      <div className={styles.actionContainer}>
        <Button variant="delete" onClick={() => auth.signOut()}>
          Logout
        </Button>
      </div>

      {hasChanges && !isLocked && (
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
