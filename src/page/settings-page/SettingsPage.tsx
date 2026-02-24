import { useParams } from "react-router-dom";

import NotificationSettings from "./NotificationSettings";
import PositionManagement from "./PositionManager";
import ProfileSettings from "./ProfileSettings";
import TeamManagement from "./TeamManagement";
import UserManagement from "./UserManagement";
import { SettingsSection, TESTER_EMAILS } from "../../constants/navigation";
import { useAppSelector } from "../../hooks/redux";

import styles from "./settings-page.module.css";

const SettingsPage = () => {
  const { userData } = useAppSelector((state) => state.auth);
  const { section: activeSection } = useParams();

  if (!userData) return null;

  return (
    <div className={styles.settingsContainer}>
      {activeSection === SettingsSection.PROFILE && <ProfileSettings />}

      {activeSection === SettingsSection.NOTIFICATIONS && 
        userData.email && TESTER_EMAILS.some(e => e.toLowerCase() === userData.email?.toLowerCase()) && 
        <NotificationSettings />}

      {activeSection === SettingsSection.USER_MANAGEMENT &&
        (userData.isAdmin ? <UserManagement /> : <p>Access Denied</p>)}

      {activeSection === SettingsSection.TEAMS &&
        (userData.isAdmin ? <TeamManagement /> : <p>Access Denied</p>)}

      {activeSection === SettingsSection.POSITIONS &&
        (userData.isAdmin ? <PositionManagement /> : <p>Access Denied</p>)}
    </div>
  );
};

export default SettingsPage;
