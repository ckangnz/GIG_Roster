import PositionManager from "./PositionManager";
import UserManagement from "./UserManagement";
import { AppUser } from "../../model/model";
import "./settings.css";

interface SettingsPageProps {
  userData: AppUser;
  activeSection: string | null;
}

const SettingsPage = ({ userData, activeSection }: SettingsPageProps) => {
  return (
    <div className="settings-container">
      {activeSection === "Profile" && (
        <section className="profile-card">
          <h2>My Profile</h2>
          {/* ... user profile info ... */}
        </section>
      )}

      {activeSection === "Users" && userData.isAdmin && <UserManagement />}

      {activeSection === "Positions" && userData.isAdmin && <PositionManager />}
    </div>
  );
};

export default SettingsPage;
