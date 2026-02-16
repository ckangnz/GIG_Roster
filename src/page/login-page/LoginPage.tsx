import { signInWithPopup } from 'firebase/auth';
import { Navigate } from 'react-router-dom';

import { auth, googleProvider } from '../../firebase';
import { useAppSelector } from '../../hooks/redux';

import styles from './login-page.module.css';

const LoginPage = () => {
  const { firebaseUser, loading } = useAppSelector((state) => state.auth);
  const loginGoogle = () => signInWithPopup(auth, googleProvider);

  if (loading) {
    return null;
  }

  if (firebaseUser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.loginContainer}>
      <header className={styles.loginHeader}>
        <h1 className={styles.brandTitle}>God is Good</h1>
        <p className={styles.brandSubtitle}>Worship Team Roster</p>
      </header>

      <div className={styles.loginButtonContainer}>
        <button onClick={loginGoogle} className={`${styles.loginButton} ${styles.google}`}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            height="18"
            alt="Google"
          />
          Login with Google
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
