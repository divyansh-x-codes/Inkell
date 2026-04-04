import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTotalUnread } from '../utils/unread';

export default function BottomNav({ showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(getTotalUnread);

  // Re-read badge whenever storage changes
  useEffect(() => {
    const refresh = () => setUnread(getTotalUnread());
    window.addEventListener('inkwell_unread_changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('inkwell_unread_changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const handleNav = (path, toastMsg = null) => {
    if (toastMsg) { showToast(toastMsg); } else { navigate(path); }
  };
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bottom-nav">
      {/* Home */}
      <div className={`nav-item ${isActive('/home') ? 'active' : ''}`} onClick={() => handleNav('/home')}>
        <svg viewBox="0 0 24 24" fill={isActive('/home') ? 'currentColor' : 'none'} stroke={isActive('/home') ? 'none' : 'currentColor'} strokeWidth={isActive('/home') ? '0' : '2'}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>

      {/* Subscriptions */}
      <div className="nav-item" onClick={() => handleNav('#', 'Subscriptions coming soon!')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
        </svg>
      </div>

      {/* Search */}
      <div className={`nav-item ${isActive('/search') ? 'active' : ''}`} onClick={() => handleNav('/search')}>
        <svg viewBox="0 0 24 24" fill="none" stroke={isActive('/search') ? 'var(--white)' : 'currentColor'} strokeWidth={isActive('/search') ? '3' : '2'} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>

      {/* Messages — with unread badge */}
      <div
        className={`nav-item ${isActive('/conversations') ? 'active' : ''}`}
        onClick={() => handleNav('/conversations')}
        style={{ position: 'relative' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        {unread > 0 && (
          <div style={{
            position: 'absolute', top: -2, right: -2,
            background: '#e85d04', color: 'white',
            width: unread > 9 ? 18 : 16, height: 16,
            borderRadius: 8, fontSize: '0.65rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'DM Sans', sans-serif", lineHeight: 1,
            border: '1.5px solid #0d0d0d',
          }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </div>

      {/* Saved */}
      <div className={`nav-item ${isActive('/saved') ? 'active' : ''}`} onClick={() => handleNav('/saved')}>
        <svg viewBox="0 0 24 24" fill={isActive('/saved') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isActive('/saved') ? '0' : '2'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
    </nav>
  );
}
