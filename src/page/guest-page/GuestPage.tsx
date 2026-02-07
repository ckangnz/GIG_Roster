import ThemeToggleButton from "../../components/common/ThemeToggleButton";
import { AppUser } from "../../model/model";
import "./guest-page.css";
import ProfileSettings from "../settings-page/ProfileSettings";

interface GuestPageProps {
  user: AppUser;
  uid: string;
}

const GuestPage = ({ user, uid }: GuestPageProps) => {
  return (
    <div className="guest-container">
      <header className="guest-header">
        <h2 className="brand-title">God is Good</h2>
        <p className="pending-label">PENDING ADMIN APPROVAL</p>
        <div className="guest-theme-toggle-container">
          <ThemeToggleButton />
        </div>
      </header>

      <ProfileSettings userData={user} uid={uid} />
    </div>
  );
};

export default GuestPage;
