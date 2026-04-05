import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function BottomNav({ showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useAuth();

  const handleNav = (path, toastMsg = null) => {
    if (toastMsg) { showToast(toastMsg); } else { navigate(path); }
  };
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bottom-nav premium-bn">
      {/* Home */}
      <div className={`nav-item ${isActive('/home') ? 'active' : ''}`} onClick={() => handleNav('/home')}>
        <svg viewBox="0 0 24 24" fill={isActive('/home') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16v3H4zM4 10h16v7l-8 4-8-4v-7z" />
        </svg>
      </div>

      {/* Inbox */}
      <div className={`nav-item ${isActive('/inbox') ? 'active' : ''}`} onClick={() => handleNav('/saved')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 3h22v18H1z"></path>
          <path d="M8 12h8"></path>
        </svg>
      </div>

      {/* Search */}
      <div className={`nav-item ${isActive('/search') ? 'active' : ''}`} onClick={() => handleNav('/search')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>

      {/* Messages */}
      <div
        className={`nav-item ${isActive('/conversations') ? 'active' : ''}`}
        onClick={() => handleNav('/conversations')}
        style={{ position: 'relative' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
        </svg>
        {unreadCount > 0 && (
          <div className="bn-badge">{unreadCount}</div>
        )}
      </div>

      {/* Activity (Notifications) */}
      <div className={`nav-item ${isActive('/activity') ? 'active' : ''}`} onClick={() => handleNav('/activity', 'Activity coming soon!')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </div>
    </nav>
  );
}
