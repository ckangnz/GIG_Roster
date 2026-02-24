import { useState, useEffect } from "react";

import SaveFooter from "../../components/common/SaveFooter";
import Toggle from "../../components/common/Toggle";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { updateUserProfile } from "../../store/slices/authSlice";
import commonStyles from "../../styles/settings-common.module.css";

const defaultPrefs = {
  all: true,
  rosterHandoff: true,
  thoughtLikes: true,
  newTeamThought: true,
  rosterReminder: true,
};

const NotificationSettings = () => {
  const dispatch = useAppDispatch();
  const { userData, firebaseUser } = useAppSelector((state) => state.auth);
  
  const [prefs, setPrefs] = useState(userData?.notificationPrefs || defaultPrefs);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userData?.notificationPrefs) {
      setPrefs(userData.notificationPrefs);
    }
  }, [userData?.notificationPrefs]);

  const hasChanges = JSON.stringify(prefs) !== JSON.stringify(userData?.notificationPrefs || defaultPrefs);

  const handleToggle = (key: keyof typeof defaultPrefs, value: boolean) => {
    if (key === "all") {
      setPrefs({
        all: value,
        rosterHandoff: value,
        thoughtLikes: value,
        newTeamThought: value,
        rosterReminder: value,
      });
    } else {
      const newPrefs = { ...prefs, [key]: value };
      // If any specific pref is turned on, "all" should be true? 
      // Actually, if all are turned off, "all" should be false. 
      // If "all" is turned off, all others should be off.
      if (!value) {
        newPrefs.all = false;
      } else {
        // If all sub-prefs are now true, set "all" to true
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { all, ...rest } = newPrefs;
        if (Object.values(rest).every(v => v)) {
          newPrefs.all = true;
        }
      }
      setPrefs(newPrefs);
    }
  };

  const handleSave = async () => {
    if (!firebaseUser?.uid) return;
    setIsSaving(true);
    try {
      await dispatch(updateUserProfile({ 
        uid: firebaseUser.uid, 
        data: { notificationPrefs: prefs } 
      })).unwrap();
    } catch (err) {
      console.error("Failed to save notification settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPrefs(userData?.notificationPrefs || defaultPrefs);
  };

  return (
    <div className={commonStyles.managementWrapper}>
      <div className={commonStyles.formGroup}>
        <label className={commonStyles.sectionLabel}>General Settings</label>
        <Toggle
          label="All Notifications"
          checked={prefs.all}
          onChange={(val) => handleToggle("all", val)}
        />
      </div>

      <div className={commonStyles.formGroup}>
        <label className={commonStyles.sectionLabel}>Roster Updates</label>
        <Toggle
          label="Roster Handoff (Team End Time)"
          checked={prefs.rosterHandoff}
          onChange={(val) => handleToggle("rosterHandoff", val)}
          disabled={!prefs.all && false} // Actually we want them independent but "all" is a master switch
        />
        <Toggle
          label="Duty Reminders (24h before)"
          checked={prefs.rosterReminder}
          onChange={(val) => handleToggle("rosterReminder", val)}
        />
      </div>

      <div className={commonStyles.formGroup}>
        <label className={commonStyles.sectionLabel}>Thoughts & Connection</label>
        <Toggle
          label="New Team Thoughts"
          checked={prefs.newTeamThought}
          onChange={(val) => handleToggle("newTeamThought", val)}
        />
        <Toggle
          label="Likes on my Thoughts"
          checked={prefs.thoughtLikes}
          onChange={(val) => handleToggle("thoughtLikes", val)}
        />
      </div>

      <div className={commonStyles.formGroup}>
        <label className={commonStyles.sectionLabel}>System Notifications</label>
        <div style={{ padding: "8px 0", fontSize: "0.85rem", color: "var(--color-text-dim)" }}>
          Critical updates (Account Approval, Admin Status) are always enabled.
        </div>
      </div>

      {hasChanges && (
        <SaveFooter
          label="Unsaved notification changes"
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};

export default NotificationSettings;
