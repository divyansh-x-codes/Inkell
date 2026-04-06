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
            <img src="/icons8-plus-96.png" alt="add" style={{ width: 32, height: 32, opacity: 0.8 }} />
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
              <img src="/logo.png" alt="logo" style={{ width: 50, height: 50, borderRadius: 4 }} />
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ width: 14, height: 14, marginLeft: -4 }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="tb-avatar" onClick={() => navigate('/my-profile')}>
              {displayAvatar ? <img src={displayAvatar} alt="av" /> : <div className="sc-initials" style={{ background: '#cc4400' }}>{getInitials(displayName)}</div>}
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
