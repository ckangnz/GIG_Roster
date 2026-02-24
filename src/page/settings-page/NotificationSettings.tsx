import { useState, useEffect } from "react";

import { CheckCircle, AlertTriangle } from "lucide-react";

import Button from "../../components/common/Button";
import SaveFooter from "../../components/common/SaveFooter";
import Toggle from "../../components/common/Toggle";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { useNotifications } from "../../hooks/useNotifications";
import { updateUserProfile } from "../../store/slices/authSlice";

import styles from "./notification-settings.module.css";

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
  const { requestPermission } = useNotifications();

  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );

  const [prefs, setPrefs] = useState(
    userData?.notificationPrefs || defaultPrefs,
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userData?.notificationPrefs) {
      setPrefs(userData.notificationPrefs);
    }
  }, [userData?.notificationPrefs]);

  const hasChanges =
    JSON.stringify(prefs) !==
    JSON.stringify(userData?.notificationPrefs || defaultPrefs);

  const handleRequestPermission = async () => {
    await requestPermission();
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  };

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
        if (Object.values(rest).every((v) => v)) {
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
      await dispatch(
        updateUserProfile({
          uid: firebaseUser.uid,
          data: { notificationPrefs: prefs },
        }),
      ).unwrap();
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
    <div className={styles.managementWrapper}>
      <div className={styles.formGroup} style={{ marginBottom: "2rem" }}>
        <label className={styles.sectionLabel}>Device Status</label>
        <div className={styles.deviceStatusContent}>
          {permission === "granted" ? (
            <div className={styles.statusBadgeSuccess}>
              <CheckCircle size={18} />
              <span>Notifications active on this device</span>
            </div>
          ) : permission === "denied" ? (
            <div className={styles.statusBadgeError}>
              <div className={styles.errorHeader}>
                <AlertTriangle size={18} />
                <span>Notifications are blocked</span>
              </div>
              <p className={styles.instructionText}>
                To enable alerts, you must manually allow them in your device
                settings or browser preferences.
              </p>
            </div>
          ) : (
            <>
              <Button
                onClick={handleRequestPermission}
                variant="primary"
                className={styles.enableBtn}
              >
                Enable Notifications on this Device
              </Button>
              <p className={styles.hintText}>
                This allows your browser to receive alerts even when the app is
                closed.
              </p>
            </>
          )}
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.sectionLabel}>General Settings</label>
        <Toggle
          label="All Notifications"
          checked={prefs.all}
          onChange={(val) => handleToggle("all", val)}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.sectionLabel}>Roster Updates</label>
        <Toggle
          label="Roster Handoff (Team End Time)"
          checked={prefs.rosterHandoff}
          onChange={(val) => handleToggle("rosterHandoff", val)}
        />
        <Toggle
          label="Duty Reminders (24h before)"
          checked={prefs.rosterReminder}
          onChange={(val) => handleToggle("rosterReminder", val)}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.sectionLabel}>Thoughts & Connection</label>
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

      <div className={styles.formGroup}>
        <label className={styles.sectionLabel}>System Notifications</label>
        <Toggle
          label="Account Approval"
          checked={true}
          onChange={() => {}}
          disabled={true}
        />
        <Toggle
          label="Admin Status Changes"
          checked={true}
          onChange={() => {}}
          disabled={true}
        />
        <p className={styles.criticalHint}>
          * Critical system updates cannot be disabled.
        </p>
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
