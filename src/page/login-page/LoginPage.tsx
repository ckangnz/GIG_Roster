import { signInWithPopup } from "firebase/auth";
import { appleProvider, auth, googleProvider } from "../../firebase";

import "./login-page.css";

const LoginPage = () => {
  const loginGoogle = () => signInWithPopup(auth, googleProvider);
  const loginApple = () => signInWithPopup(auth, appleProvider);

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

        <button onClick={loginApple} className="login-button apple">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
            height="18"
            alt="Apple"
            className="apple-icon"
          />
          Login with Apple
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
