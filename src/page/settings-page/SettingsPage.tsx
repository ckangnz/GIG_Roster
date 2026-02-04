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
          <div className="profile-info">
            <p>
              <strong>Name:</strong> {userData.name}
            </p>
            <p>
              <strong>Email:</strong> {userData.email}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              {userData.isApproved ? "✅ Approved" : "⏳ Pending"}
            </p>
          </div>
        </section>
      )}

      {activeSection === "Users" && userData.isAdmin && (
        <div className="admin-content">
          <UserManagement />
        </div>
      )}

      {activeSection === "Positions" && userData.isAdmin && (
        <div className="admin-content">
          <PositionManager />
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
