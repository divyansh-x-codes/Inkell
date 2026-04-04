import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup({ showToast }) {
  const navigate = useNavigate();
  const { signUp, loginWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loading, setLoading] = useState(false);

  const doSignup = async () => {
    if (!name || !email || !password) {
      showToast('Please fill in all fields');
      return;
    }
    setLoading(true);
    const { error } = await signUp(name, email, password);
    setLoading(false);
    
    if (error) {
      showToast(error.message || 'Signup failed');
    } else {
      showToast('Account created!');
      navigate('/home');
    }
  };

  const handleGoogleSignup = async () => {
    setLoadingGoogle(true);
    const { user, error } = await loginWithGoogle();
    setLoadingGoogle(false);
    if (error) {
      showToast(error.message || 'Google login failed');
    } else {
      showToast(`Welcome, ${user.displayName || 'User'}!`);
      navigate('/home');
    }
  };

  return (
    <div id="v-signup" className="view active">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
      </div>
      <h2 className="screen-title">Create account</h2>
      <p className="screen-sub">Join thousands of great writers & readers</p>

      {/* Google Signup */}
      <button
        className="btn-social"
        onClick={handleGoogleSignup}
        disabled={loadingGoogle}
        style={{ width: '100%', marginBottom: '16px', justifyContent: 'center', opacity: loadingGoogle ? 0.7 : 1 }}
      >
        <svg viewBox="0 0 24 24" width="18" fill="currentColor" style={{ marginRight: 8 }}>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {loadingGoogle ? 'Signing in...' : 'Continue with Google'}
      </button>

      <div className="divider">or sign up with email</div>

      <div className="input-group">
        <label>Full Name</label>
        <input
          type="text"
          placeholder="Divyansh Chaudhary"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
        onClick={doSignup}
        disabled={loading}
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>

      <p className="switch-auth">Already have an account? <span onClick={() => navigate('/login')}>Log in</span></p>
    </div>
  );
}
