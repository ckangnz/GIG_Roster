import { signInWithPopup } from 'firebase/auth';
import { Navigate } from 'react-router-dom';

import { auth, googleProvider } from '../../firebase';
import { useAppSelector } from '../../hooks/redux';

import './login-page.css';

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
    <div className="login-container">
      <header className="login-header">
        <h1 className="brand-title">God is Good</h1>
        <p className="brand-subtitle">Worship Team Roster</p>
      </header>

      <div className="login-button-container">
        <button onClick={loginGoogle} className="login-button google">
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
