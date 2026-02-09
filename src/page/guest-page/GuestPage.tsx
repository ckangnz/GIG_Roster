import { Navigate } from "react-router-dom";

import ThemeToggleButton from "../../components/common/ThemeToggleButton";
import { useAppSelector } from "../../hooks/redux";
import LoadingPage from "../loading-page/LoadingPage";
import ProfileSettings from "../settings-page/ProfileSettings";
import "./guest-page.css";

const GuestPage = () => {
  const { userData, firebaseUser, loading } = useAppSelector(
    (state) => state.auth,
  );

  if (loading) return <LoadingPage />;

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (!userData) {
    return <LoadingPage />;
  }

  if (userData.isApproved) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="guest-container">
      <header className="guest-header">
        <h2 className="brand-title">God is Good</h2>
        <p className="pending-label">PENDING ADMIN APPROVAL</p>
        <div className="guest-theme-toggle-container">
          <ThemeToggleButton />
        </div>
      </header>

      <ProfileSettings />
    </div>
  );
};

export default GuestPage;
