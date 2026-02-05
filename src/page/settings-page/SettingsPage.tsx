import PositionManager from "./PositionManager";
import ProfileSettings from "./ProfileSettings";
import UserManagement from "./UserManagement";
import { SettingsSection } from "../../constants/navigation";
import { AppUser } from "../../model/model";

import "./shared-settings.css";

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

      {activeSection === SettingsSection.POSITIONS && userData.isAdmin && (
        <div className="admin-content">
          <PositionManager />
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
