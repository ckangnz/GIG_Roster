import PositionManager from "./PositionManager";
import ProfileSettings from "./ProfileSettings";
import UserManagement from "./UserManagement";
import { SettingsSection } from "../../constants/navigation";
import { AppUser } from "../../model/model";
import "./settings.css";

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

      {activeSection === SettingsSection.USERS && userData.isAdmin && (
        <div className="admin-content">
          <UserManagement />
        </div>
      )}

      {activeSection === SettingsSection.POSITIONS && userData.isAdmin && (
        <div className="admin-content">
          <PositionManager />
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
