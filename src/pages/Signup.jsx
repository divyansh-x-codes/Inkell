import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup({ showToast }) {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const doSignup = () => {
    if (!name || !email) {
      showToast('Please fill in all fields');
      return;
    }
    signIn(name, email);
    showToast('Account created!');
    navigate('/home');
  };

  return (
    <div id="v-signup" className="view active">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
      </div>
      <h2 className="screen-title">Create account</h2>
      <p className="screen-sub">Join thousands of great writers & readers</p>

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
        <label>Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button className="btn-primary" style={{ marginTop: '8px' }} onClick={doSignup}>
        Create account
      </button>

      <p className="switch-auth">Already have an account? <span onClick={() => navigate('/login')}>Log in</span></p>
    </div>
  );
}
