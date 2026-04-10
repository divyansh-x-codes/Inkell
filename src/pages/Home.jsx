import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';


import BottomNav from '../components/BottomNav';
import ArticleCard from '../components/ArticleCard';
import { useAuth } from '../context/AuthContext';
import { getAIFeed, subscribeToPosts } from '../utils/firebaseData';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

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
    // Standardize to UID for database lookups
    if (!userId) {
      setFollowedUsers([]);
      return;
    }
    
    const q = query(collection(db, 'follows'), where('follower_id', '==', userId));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const followed = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const followingId = docSnap.data().following_id;
        const pSnap = await getDocs(query(collection(db, 'profiles'), where('id', '==', followingId)));
        return pSnap.docs[0]?.data();
      }));
      setFollowedUsers(followed.filter(Boolean));
    });

    return () => unsubscribe();
  }, [userId]);

  const [brokenImages, setBrokenImages] = useState({});
  const handleImageError = (uid) => setBrokenImages(prev => ({ ...prev, [uid]: true }));

  if (!userId) return null;

  return (
    <div className="following-bar">
      <div className="stories-scroll">
        <div className="story-item add-more" onClick={() => navigate('/search')}>
          <div className="story-avatar plus-btn">
            <img src="/icons8-plus-96.png" alt="add" style={{ width: 32, height: 32, opacity: 0.8 }} />
          </div>
          <div className="story-name">Add more</div>
        </div>

        {followedUsers.map((u) => (
          <div key={u.id} className="story-item" onClick={() => navigate(`/profile/${encodeURIComponent(u.username || u.name)}`, { state: { authorId: u.id } })}>
            <div className="story-avatar">
              {(u.avatar_url) && !brokenImages[u.id] ? (
                <img src={u.avatar_url} alt={u.name} onError={() => handleImageError(u.id)} />
              ) : (
                <div className="story-initials" style={{ background: colorForName(u.name || 'U') }}>{getInitials(u.name || 'U')}</div>
              )}
            </div>
            <div className="story-name">{u.name?.split(' ')[0]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Module-level cache to prevent flicker when navigating back to Home
let cachedArticles = [];

export default function Home({ showToast }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [articles, setArticles] = useState(cachedArticles);
  const [loading, setLoading] = useState(cachedArticles.length === 0);
  const [feedError, setFeedError] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [feedType, setFeedType] = useState('foryou');
  const [retryKey, setRetryKey] = useState(0);

  const displayName = user?.profiles?.name || user?.name || 'User';
  const displayAvatar = user?.profiles?.avatar_url || user?.avatar_url || null;

  useEffect(() => {
    let cancelled = false;

    // 100% Real-time Subscription (Strict Action)
    const unsubscribePosts = subscribeToPosts((newPosts) => {
      if (!cancelled && newPosts) {
        setArticles(newPosts);
        setLoading(false);
        cachedArticles = newPosts;
      }
    });

    return () => {
      cancelled = true;
      unsubscribePosts();
    };
  }, [retryKey]);

  // Scroll logic for Topbar visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        if (isVisible) setIsVisible(false);
      } else {
        if (!isVisible) setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isVisible]);

  return (
    <div id="v-home" className="view active">
      <div className="app-shell">
        <div className={`chronicle-topbar premium ${!isVisible ? 'hidden' : ''}`}>
          <div className="topbar-left">
            <div className="brand-logo" onClick={() => navigate('/')}>
              <img src="/logo.png" alt="logo" style={{ width: 40, height: 40, borderRadius: 8 }} />
              <span style={{ fontWeight: 800, fontSize: '1.2rem', marginLeft: 8 }}>Inktrix</span>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="tb-avatar" onClick={() => navigate('/my-profile')}>
              {displayAvatar ? <img src={displayAvatar} alt="av" /> : <div className="sc-initials" style={{ background: '#cc4400' }}>{getInitials(displayName)}</div>}
            </div>
          </div>
        </div>

        <div className="feed" id="main-feed" style={{ paddingTop: '20px', paddingBottom: '100px' }}>
          <FollowingBar userId={user?.uid || user?.id} navigate={navigate} />


          <div className="article-list-container">
            {loading ? (
              <div className="feed-status empty">
                <h3>Connecting...</h3>
                <p>Establishing real-time link to feed</p>
              </div>
            ) : feedError ? (
              <div className="feed-status empty">
                <h3>Couldn't load feed</h3>
                <p>Please check your connection and try again.</p>
                <button
                  onClick={() => { setRetryKey(k => k + 1); }}
                  style={{
                    marginTop: 16,
                    padding: '10px 28px',
                    borderRadius: 24,
                    border: 'none',
                    background: 'linear-gradient(135deg, #ff6b35, #f7c948)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            ) : articles.length === 0 ? (
              <div className="feed-status empty">
                <h3>No articles yet</h3>
                <p>Start exploring or share your first story!</p>
                <button 
                  onClick={() => navigate('/add-article')}
                  style={{
                    marginTop: 20,
                    padding: '12px 32px',
                    borderRadius: 24,
                    border: 'none',
                    background: 'var(--orange)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(232, 93, 4, 0.3)'
                  }}
                >
                  Create First Post
                </button>
              </div>
            ) : (
              articles.map((article) => (
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

