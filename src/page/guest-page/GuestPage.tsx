import { Navigate } from "react-router-dom";

import ThemeToggleButton from "../../components/common/ThemeToggleButton";
import { useAppSelector } from "../../hooks/redux";
import LoadingPage from "../loading-page/LoadingPage";
import ProfileSettings from "../settings-page/ProfileSettings";

import styles from "./guest-page.module.css";

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
    <div className={styles.guestContainer}>
      <header className={styles.guestHeader}>
        <h2 className={styles.brandTitle}>God is Good</h2>
        <p className={styles.pendingLabel}>PENDING ADMIN APPROVAL</p>
        <div className={styles.guestThemeToggleContainer}>
          <ThemeToggleButton />
        </div>
      </header>

      <ProfileSettings className={styles.profileCardOverride} />
    </div>
  );
};

export default GuestPage;
