import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import ArticleCard from '../components/ArticleCard';
import { useAuth } from '../context/AuthContext';
import { subscribeToBlogs, subscribeToFollowedBlogs } from '../utils/firebaseData';

const getInitials = (name) => {
  if (!name) return 'U';
  const s = name.trim().split(' ');
  return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name[0].toUpperCase();
};

export default function Home({ showToast }) {
  const navigate = useNavigate();
  const { user, unreadCount } = useAuth();
  const [articles, setArticles] = useState([]);
  const [followedArticles, setFollowedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('forYou');

  // ── Real-time global feed ──────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToBlogs((blogs) => {
      const sorted = [...blogs].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setArticles(sorted);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── Real-time following feed ───────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    subscribeToFollowedBlogs(user.uid, (blogs) => {
      const sorted = [...blogs].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setFollowedArticles(sorted);
    });
  }, [user]);


  const displayName = user?.name || user?.displayName || 'User';
  const displayAvatar = user?.avatar || user?.photoURL || null;

  const visibleArticles = activeTab === 'following'
    ? followedArticles
    : articles;

  return (
    <div id="v-home" className="view active">
      <div className="app-shell" style={{ position: 'relative' }}>
        <div className="chronicle-topbar">
          <div className="chronicle-logo">Inkwell.</div>
          <div className="topbar-actions">
            {/* Publish Button */}
            <button
              className="topbar-icon-btn"
              onClick={() => navigate('/add-article')}
              title="Write an article"
              style={{ color: '#e85d04' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 22, height: 22 }}>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>

            {/* Notifications */}
            <button
              className="topbar-icon-btn"
              onClick={() => navigate('/conversations')}
              style={{ position: 'relative' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadCount > 0 && (
                <div className="topbar-badge">{unreadCount > 9 ? '9+' : unreadCount}</div>
              )}
            </button>

            {/* Avatar */}
            <div
              onClick={() => navigate('/my-profile')}
              style={{
                width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
                background: displayAvatar ? 'transparent' : '#1a9e6e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.85rem', color: 'white',
                fontFamily: "'DM Sans', sans-serif",
                border: '2px solid #2a2a2a',
                overflow: 'hidden', flexShrink: 0,
              }}
            >
              {displayAvatar
                ? <img src={displayAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : getInitials(displayName)
              }
            </div>
          </div>
        </div>

        <div className="feed" id="main-feed" style={{ paddingBottom: '70px', background: 'var(--bg)' }}>
          {/* Feed Tabs */}
          <div className="category-tabs">
            <button
              className={`cat-pill ${activeTab === 'forYou' ? 'active' : ''}`}
              onClick={() => setActiveTab('forYou')}
            >
              For You
            </button>
            <button
              className={`cat-pill ${activeTab === 'following' ? 'active' : ''}`}
              onClick={() => setActiveTab('following')}
            >
              Following
            </button>
          </div>

          <div style={{ padding: '0 16px' }}>
            {loading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#555' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>📖</div>
                <div style={{ fontSize: '0.9rem' }}>Loading your feed...</div>
              </div>
            ) : visibleArticles.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#555' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>
                  {activeTab === 'following' ? '👥' : '📰'}
                </div>
                <div style={{ color: 'white', fontWeight: 600, marginBottom: 8 }}>
                  {activeTab === 'following' ? 'Follow authors to see their posts' : 'No articles yet'}
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  {activeTab === 'following'
                    ? 'Tap Subscribe on any article to follow authors'
                    : 'Be the first to publish!'}
                </div>
              </div>
            ) : (
              visibleArticles.map((article) => (
                <ArticleCard key={article.id} article={article} showToast={showToast} />
              ))
            )}
          </div>
        </div>

        <BottomNav showToast={showToast} />
      </div>
    </div>
  );
}
