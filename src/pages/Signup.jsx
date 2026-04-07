import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup({ showToast }) {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const doSignup = async () => {
    if (!name || !email || !password) {
      showToast('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error } = await signUp(name, email, password);
    if (error) {
      setLoading(false);
      showToast(error.message || 'Signup failed');
    }
    // On success: AuthContext's onAuthStateChange fires → ProtectedRoute sends to /home
    // Keep loading=true so user can't double-tap
  };

  return (
    <div id="v-signup" className="view active">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
      </div>
      <h2 className="screen-title">Create account</h2>
      <p className="screen-sub">Join thousands of great writers & readers</p>

      <div className="input-group" style={{ marginTop: '20px' }}>
        <label>Full Name</label>
        <input
          type="text"
          placeholder="Divyansh Chaudhary"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
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
        onClick={doSignup}
        disabled={loading}
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>

      <p className="switch-auth">Already have an account? <span onClick={() => navigate('/login')}>Log in</span></p>
    </div>
  );
}
