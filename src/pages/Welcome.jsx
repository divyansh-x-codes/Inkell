import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div id="v-welcome" className="view active">
      <div className="logo-area">
        <div className="logo-mark"></div>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: 'var(--white)' }}>
          Inktrix
        </span>
      </div>

      <div className="hero-section">
        <div className="illustration-grid">
          <div className="ill-item">✍️</div>
          <div className="ill-item">📖</div>
          <div className="ill-item">🔖</div>
          <div className="ill-item">📬</div>
          <div className="ill-item">🚩</div>
          <div className="ill-item">📚</div>
          <div className="ill-item">🏛️</div>
          <div className="ill-item">🖊️</div>
          <div className="ill-item">📰</div>
        </div>
        <h1 className="hero-title">Welcome to<br />Inktrix</h1>
        <p className="hero-sub">The home for great culture</p>
      </div>

      <div className="cta-area">
        <button className="btn-primary" onClick={() => navigate('/signup')}>Sign up free</button>
        <button className="btn-secondary" onClick={() => navigate('/login')}>Log in</button>
        <p className="legal">
          By signing up, you agree to Inktrix's <a href="#">Terms of Use</a> and <a href="#">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
