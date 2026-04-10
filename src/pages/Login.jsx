import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login({ showToast }) {
  const navigate = useNavigate();
  const { logIn, loginWithGoogle, loginAsDemoUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    if (!email || !password) {
      showToast('Please enter your email and password');
      return;
    }
    setLoading(true);
    const { error } = await logIn(email, password);
    if (error) {
      setLoading(false);
      let msg = 'Incorrect email or password. Please try again or sign up.';
      
      if (error.code === 'auth/api-key-not-valid' || error.message?.includes('api-key-not-valid')) {
        msg = "Configuration Error: Invalid Firebase API Key.";
      } else if (error.code === 'auth/too-many-requests') {
        msg = "Access temporarily disabled due to many failed attempts. Try again later.";
      } else if (error.code === 'auth/user-not-found') {
        msg = "No account found with this email. Please sign up.";
      } else if (error.code === 'auth/wrong-password') {
        msg = "Incorrect password. Please try again.";
      }
      
      showToast(msg);
    } else {
      navigate('/home', { replace: true });
    }
    // On success: DON'T navigate manually.
    // AuthContext's onAuthStateChange will set user → ProtectedRoute auto-redirects to /home.
    // We keep loading=true to prevent double-click while auth resolves.
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await loginWithGoogle();
    if (error) {
      setLoading(false);
      showToast(error.message || 'Google login failed');
    } else {
      navigate('/home', { replace: true });
    }
    // On success: Google OAuth redirects externally; the auth listener handles the rest.
  };

  return (
    <div id="v-login" className="view active">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
      </div>
      <h2 className="screen-title">Welcome back</h2>
      <p className="screen-sub">Log in to your Inktrix account</p>

      {/* Google Login */}
      <button
        className="btn-social"
        onClick={handleGoogleLogin}
        disabled={loading}
        style={{ width: '100%', marginBottom: '16px', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
      >
        <svg viewBox="0 0 24 24" width="18" fill="currentColor" style={{ marginRight: 8 }}>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>

      <div className="divider">or login with email</div>

      <div className="input-group">
        <label>Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="input-group">
        <label>Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button
        className="btn-primary"
        style={{ marginTop: '8px', opacity: loading ? 0.7 : 1 }}
        onClick={doLogin}
        disabled={loading}
      >
        {loading ? 'Logging in...' : 'Continue'}
      </button>

      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Development Blockers?</p>
        <button 
          onClick={async () => {
             const { error } = await loginAsDemoUser();
             if (!error) navigate('/home', { replace: true });
             else showToast(error.message || 'Demo login failed');
          }}
          style={{ 
            background: 'transparent', 
            border: '1px solid rgba(255,255,255,0.1)', 
            color: 'var(--orange)', 
            padding: '8px 16px', 
            borderRadius: '20px', 
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Enter Demo Mode →
        </button>
      </div>

      <p className="switch-auth">Don't have an account? <span onClick={() => navigate('/signup')}>Sign up</span></p>
    </div>
  );
}
