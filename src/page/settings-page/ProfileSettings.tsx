import { useState, useMemo, useEffect } from "react";

import { Smile } from "lucide-react";
import { useTranslation } from "react-i18next";

import TeamPositionEditor from "./TeamPositionEditor";
import Button from "../../components/common/Button";
import Pill, { PillGroup } from "../../components/common/Pill";
import SaveFooter from "../../components/common/SaveFooter";
import Toggle from "../../components/common/Toggle";
import { auth } from "../../firebase";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import {
  updateUserProfile,
  selectUserData,
} from "../../store/slices/authSlice";
import formStyles from "../../styles/form.module.css";

import styles from "./profile-settings.module.css";

const getInitials = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return null;
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ProfileSettings = ({
  className,
  showExtendedInfo = true,
}: {
  className?: string;
  showExtendedInfo?: boolean;
}) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { firebaseUser } = useAppSelector((state) => state.auth);
  const userData = useAppSelector(selectUserData);
  const orgId = userData?.orgId;
  const { teams: allTeams } = useAppSelector((state) => state.teams);
  const availableTeams = useMemo(
    () => allTeams.filter((t) => t.orgId === orgId),
    [allTeams, orgId],
  );

  const { positions: globalPositions } = useAppSelector(
    (state) => state.positions,
  );

  const [formState, setFormState] = useState({
    name: "",
    gender: "",
    isActive: true,
    teams: [] as string[],
    teamPositions: {} as Record<string, string[]>,
    preferredLanguage: "en-NZ",
  });

  const [status, setStatus] = useState("idle");
  const [isInitialized, setIsInitialized] = useState(false);

  const isLocked = !userData?.isApproved && !!userData?.name;

  // Initial sync from Redux
  useEffect(() => {
    if (!userData || isInitialized || status === "saving") return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormState({
      name: userData.name || "",
      gender: userData.gender || "",
      isActive: userData.isActive ?? true,
      teams: userData.teams || [],
      teamPositions: userData.teamPositions || {},
      preferredLanguage: userData.preferredLanguage || "en-NZ",
    });
    setIsInitialized(true);
  }, [userData, isInitialized, status]);

  const hasChanges = useMemo(() => {
    if (!userData) return false;
    const originalData = {
      name: userData.name || "",
      gender: userData.gender || "",
      isActive: userData.isActive ?? true,
      teams: userData.teams || [],
      teamPositions: userData.teamPositions || {},
      preferredLanguage: userData.preferredLanguage || "en-NZ",
    };
    return JSON.stringify(formState) !== JSON.stringify(originalData);
  }, [formState, userData]);

  const isFormValid = !!formState.name.trim();

  const handleSave = async () => {
    if (!firebaseUser || !isFormValid) return;
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
      preferredLanguage: userData.preferredLanguage || "en-NZ",
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
          data: { ...formState, name: "", gender: "" },
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

  const toggleTeamPosition = (teamName: string, posId: string) => {
    setFormState((prev) => {
      const current = prev.teamPositions[teamName] || [];
      const updated = current.includes(posId)
        ? current.filter((id) => id !== posId)
        : [...current, posId];
      return {
        ...prev,
        teamPositions: { ...prev.teamPositions, [teamName]: updated },
      };
    });
  };

  if (!userData) {
    return <div>Loading profile...</div>;
  }

  const initials = getInitials(formState.name);

  return (
    <section className={`${styles.profileCard} ${className || ""}`}>
      {/* Hero */}
      <div className={styles.profileHero}>
        <div className={`${styles.profileAvatar} ${!initials ? styles.profileAvatarPlaceholder : ""}`}>
          {initials ?? <Smile size={32} />}
        </div>
        <h2 className={styles.profileHeroName}>
          {formState.name.trim() || t("settings.name")}
        </h2>
        <p className={styles.profileHeroEmail}>{userData.email}</p>
      </div>

      {/* Form body */}
      <div className={styles.profileBody}>
        <div className={formStyles.formGroup}>
          <label aria-required="true">{t("settings.name")}</label>
          <input
            required
            type="text"
            value={formState.name}
            disabled={isLocked}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, name: e.target.value }))
            }
            className={`${formStyles.formInput} ${!isFormValid ? formStyles.inputError : ""}`}
          />
          {!isFormValid && (
            <span className={formStyles.errorText}>
              {t("settings.nameRequired")}
            </span>
          )}
        </div>

        <div className={formStyles.formGroup}>
          <label>{t("settings.gender")}</label>
          <PillGroup>
            {[
              { value: "Male", label: t("settings.male"), colour: "var(--color-male)" },
              { value: "Female", label: t("settings.female"), colour: "var(--color-female)" },
              { value: "Undefined", label: t("settings.undefined"), colour: "var(--color-text-dim)" },
            ].map((g) => (
              <Pill
                key={g.value}
                colour={g.colour}
                onClick={() => { if (!isLocked) setFormState((prev) => ({ ...prev, gender: g.value })); }}
                isActive={formState.gender === g.value}
                isDisabled={isLocked}
              >
                {g.label}
              </Pill>
            ))}
          </PillGroup>
        </div>

        <div className={formStyles.formGroup}>
          <label>{t("settings.language")}</label>
          <PillGroup>
            {[
              { value: "en-NZ", label: t("settings.english") },
              { value: "ko", label: t("settings.korean") },
            ].map((l) => (
              <Pill
                key={l.value}
                onClick={() => { if (!isLocked) setFormState((prev) => ({ ...prev, preferredLanguage: l.value })); }}
                isActive={formState.preferredLanguage === l.value}
                isDisabled={isLocked}
              >
                {l.label}
              </Pill>
            ))}
          </PillGroup>
        </div>

        {showExtendedInfo && (
          <>
            {userData.isApproved ? (
              availableTeams.length > 0 ? (
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
                <div className={styles.noTeamsNotice}>
                  <p>{t("settings.noTeamsInOrg")}</p>
                </div>
              )
            ) : (
              <div className={styles.approvalNotice}>
                <p>
                  Your account is pending approval. Once approved by an
                  administrator, you will be able to select your teams and
                  positions.
                </p>
              </div>
            )}
          </>
        )}

        {!isLocked && (
          <div className={formStyles.formGroup}>
            <div className={styles.availabilityRow}>
              <div>
                <label className={styles.availabilityLabel}>{t("settings.availability")}</label>
                <p className={formStyles.fieldHint}>{t("settings.availabilityHint")}</p>
              </div>
              <Toggle
                isOn={formState.isActive}
                onToggle={(isOn) => setFormState((prev) => ({ ...prev, isActive: isOn }))}
              />
            </div>
          </div>
        )}

        {isLocked && (
          <div className={styles.lockedStatusContainer}>
            <div className={styles.lockedBadge}>
              <span className={styles.lockedPulse} />
              Application Submitted
            </div>
            <p className={styles.lockedHint}>
              Your profile is currently being reviewed. You will receive access
              once approved by an administrator.
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
            {t("common.logout")}
          </Button>
        </div>
      </div>

      {hasChanges && !isLocked && (
        <SaveFooter
          label={t("common.unsavedChanges", { defaultValue: "Unsaved profile changes" })}
          saveText={t("common.save")}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={status === "saving"}
          isDisabled={!isFormValid}
        />
      )}
    </section>
  );
};

export default ProfileSettings;
