import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login({ showToast }) {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const doLogin = () => {
    if (!email) {
      showToast('Please enter your email');
      return;
    }
    const displayName = name || email.split('@')[0];
    signIn(displayName, email);
    showToast('Welcome back!');
    navigate('/home');
  };

  return (
    <div id="v-login" className="view active">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
      </div>
      <h2 className="screen-title">Welcome back</h2>
      <p className="screen-sub">Log in to your Inkwell account</p>

      <div className="input-group">
        <label>Name (optional)</label>
        <input
          type="text"
          placeholder="Your name"
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
      <button className="btn-primary" style={{ marginTop: '8px' }} onClick={doLogin}>
        Continue
      </button>

      <p className="switch-auth">Don't have an account? <span onClick={() => navigate('/signup')}>Sign up</span></p>
    </div>
  );
}
