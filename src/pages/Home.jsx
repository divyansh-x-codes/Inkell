import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import ArticleCard from '../components/ArticleCard';
import { useAuth } from '../context/AuthContext';
import { subscribeToBlogs, subscribeToFollowedBlogs, subscribeToFollowedUsers } from '../utils/firebaseData';

const getInitials = (name) => {
  if (!name) return 'U';
  const s = name.trim().split(' ');
  return s.length > 1 ? (s[0][0] + (s[1][0] || '')).toUpperCase() : name[0].toUpperCase();
};

const avatarColors = ['#cc4400','#2b9348','#7046a0','#1a6fa8','#c0392b','#16a085'];
const colorForName = (name) => avatarColors[(name||'A').charCodeAt(0) % avatarColors.length];

function FollowingBar({ userId, navigate }) {
  const [followedUsers, setFollowedUsers] = useState([]);

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToFollowedUsers(userId, setFollowedUsers);
    return () => unsub && unsub();
  }, [userId]);

  const [brokenImages, setBrokenImages] = useState({});
  const handleImageError = (uid) => setBrokenImages(prev => ({ ...prev, [uid]: true }));

  if (!userId) return null;

  return (
    <div className="following-bar">
      <div className="stories-scroll">
        {followedUsers.map((u) => (
          <div key={u.id} className="story-item" onClick={() => navigate(`/profile/${encodeURIComponent(u.name)}`, { state: { authorId: u.id } })}>
            <div className="story-avatar">
              {(u.avatar || u.photoURL) && !brokenImages[u.id] ? (
                <img src={u.avatar || u.photoURL} alt={u.name} onError={() => handleImageError(u.id)} />
              ) : (
                <div className="story-initials" style={{ background: colorForName(u.name || 'U') }}>{getInitials(u.name || 'U')}</div>
              )}
            </div>
            <div className="story-name">{u.name?.split(' ')[0]}</div>
          </div>
        ))}
        
        <div className="story-item add-more" onClick={() => navigate('/search')}>
          <div className="story-avatar plus-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
          <div className="story-name">Add more</div>
        </div>
      </div>
    </div>
  );
}

export default function Home({ showToast }) {
  const navigate = useNavigate();
  const { user, unreadCount } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const displayName = user?.name || user?.displayName || 'User';
  const displayAvatar = user?.avatar || user?.photoURL || null;
  useEffect(() => {
    const unsubscribe = subscribeToBlogs((blogs) => {
      const sorted = [...blogs].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setArticles(sorted);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Scroll logic for Topbar visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Always show at the top
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down
        if (isVisible) setIsVisible(false);
      } else {
        // Scrolling up
        if (!isVisible) setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isVisible]);

  const visibleArticles = articles;



  return (
    <div id="v-home" className="view active">
      <div className="app-shell">
        <div className={`chronicle-topbar premium ${!isVisible ? 'hidden' : ''}`}>
          <div className="topbar-left">
            <div className="brand-logo" onClick={() => navigate('/')}>
              <svg viewBox="0 0 24 24" fill="var(--orange)" style={{ width: 26, height: 26 }}>
                <path d="M4 4h16v3H4zM4 10h16v7l-8 4-8-4v-7z" />
              </svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ width: 14, height: 14, marginLeft: -4 }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="tb-action-btn" onClick={() => navigate('/search')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
            <button className="tb-action-btn" onClick={() => navigate('/conversations')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadCount > 0 && <div className="tb-dot"></div>}
            </button>
            <div className="tb-avatar" onClick={() => navigate('/my-profile')}>
              {displayAvatar ? <img src={displayAvatar} alt="me" /> : <span>{getInitials(displayName)}</span>}
            </div>
          </div>
        </div>

        <div className="feed" id="main-feed" style={{ paddingBottom: '70px' }}>
          <FollowingBar userId={user?.uid} navigate={navigate} />

          <div className="article-list-container">
            {loading ? (
              <div className="feed-status">Loading feed...</div>
            ) : visibleArticles.length === 0 ? (
              <div className="feed-status empty">
                <h3>No articles yet</h3>
                <p>Start exploring to find your favorite writers.</p>
              </div>
            ) : (
              visibleArticles.map((article) => (
                <ArticleCard key={article.id} article={article} showToast={showToast} />
              ))
            )}
          </div>
        </div>

        <BottomNav showToast={showToast} currentPath="/home" />
      </div>
    </div>
  );
}
