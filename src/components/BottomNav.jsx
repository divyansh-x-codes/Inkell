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
        <img 
          src="/icons8-home-192.png" 
          alt="home" 
          style={{ 
            width: 32, 
            height: 32, 
            opacity: isActive('/home') ? 1 : 0.5, 
            transition: 'opacity 0.2s',
            filter: 'brightness(1.2)'
          }} 
        />
      </div>

      {/* Saved / Bookmarks */}
      <div className={`nav-item ${isActive('/saved') ? 'active' : ''}`} onClick={() => handleNav('/saved')}>
        <img 
          src="/icons8-bookmark-96 (1).png" 
          alt="saved" 
          style={{ 
            width: 32, 
            height: 32, 
            opacity: isActive('/saved') ? 1 : 0.5, 
            transition: 'opacity 0.2s',
            filter: 'brightness(1.2)'
          }} 
        />
      </div>

      {/* Create / Add (+ icon) */}
      <div className={`nav-item action-item ${isActive('/add-article') ? 'active' : ''}`} onClick={() => handleNav('/add-article')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>

      {/* Messages */}
      <div
        className={`nav-item ${isActive('/conversations') ? 'active' : ''}`}
        onClick={() => handleNav('/conversations')}
        style={{ position: 'relative' }}
      >
        <img 
          src="/icons8-chat-96.png" 
          alt="messages" 
          style={{ 
            width: 32, 
            height: 32, 
            opacity: isActive('/conversations') ? 1 : 0.5, 
            transition: 'opacity 0.2s',
            filter: 'brightness(1.2)'
          }} 
        />
        {unreadCount > 0 && (
          <div className="bn-badge">{unreadCount}</div>
        )}
      </div>

      {/* Activity (Notifications) */}
      <div className={`nav-item ${isActive('/activity') ? 'active' : ''}`} onClick={() => handleNav('/activity', 'Activity coming soon!')}>
        <img 
          src="/icons8-bell-96.png" 
          alt="activity" 
          style={{ 
            width: 32, 
            height: 32, 
            opacity: isActive('/activity') ? 1 : 0.5, 
            transition: 'opacity 0.2s',
            filter: 'brightness(1.2)'
          }} 
        />
      </div>
    </nav>
  );
}
