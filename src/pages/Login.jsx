import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login({ showToast }) {
  const navigate = useNavigate();
  const { logIn } = useAuth();
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
    setLoading(false);

    if (error) {
      showToast(error.message || 'Login failed');
    } else {
      showToast('Welcome back!');
      navigate('/home', { replace: true });
    }
  };

  return (
    <div id="v-login" className="view active">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
      </div>
      <h2 className="screen-title">Welcome back</h2>
      <p className="screen-sub">Log in to your Inkwell account</p>

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

      <p className="switch-auth">Don't have an account? <span onClick={() => navigate('/signup')}>Sign up</span></p>
    </div>
  );
}
