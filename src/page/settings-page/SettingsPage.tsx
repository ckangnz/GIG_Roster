import PositionManagement from "./PositionManager";
import ProfileSettings from "./ProfileSettings";
import TeamManagement from "./TeamManagement"; // Import TeamManagement
import UserManagement from "./UserManagement";
import { SettingsSection } from "../../constants/navigation";
import { AppUser } from "../../model/model";

import "./settings-page.css";

interface SettingsPageProps {
  userData: AppUser;
  uid: string;
  activeSection: string | null;
}

const SettingsPage = ({ userData, uid, activeSection }: SettingsPageProps) => {
  return (
    <div className="settings-container">
      {activeSection === SettingsSection.PROFILE && (
        <ProfileSettings key={uid} userData={userData} uid={uid} />
      )}

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
