import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import ArticleCard from '../components/ArticleCard';
import { articles as mockArticles } from '../data';
import { useAuth } from '../context/AuthContext';
import { fetchArticles, seedMockArticles } from '../utils/supabaseData';
import { getTotalUnread } from '../utils/unread';

const getInitials = (name) => {
  if (!name) return 'U';
  const s = name.trim().split(' ');
  return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name[0].toUpperCase();
};

export default function Home({ showToast }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [unread, setUnread] = useState(getTotalUnread);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // Seed if empty (just a convenience for the user)
      if (user) await seedMockArticles(mockArticles);
      
      const data = await fetchArticles();
      setArticles(data.length > 0 ? data : mockArticles);
      setLoading(false);
    }
    init();
  }, [user]);

  useEffect(() => {
    const refresh = () => setUnread(getTotalUnread());
    window.addEventListener('inkwell_unread_changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('inkwell_unread_changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const profile = {
    name: user?.user_metadata?.full_name || 'User',
    avatar: user?.user_metadata?.avatar_url || null,
    color: '#1a9e6e'
  };

  return (
    <div id="v-home" className="view active">
      <div className="app-shell" style={{ position: 'relative' }}>
        <div className="chronicle-topbar">
          <div className="chronicle-logo">Inkwell.</div>
          <div className="topbar-actions">
            <button
              className="topbar-icon-btn"
              onClick={() => navigate('/conversations')}
              style={{ position: 'relative' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unread > 0 && (
                <div className="topbar-badge">
                  {unread > 9 ? '9+' : unread}
                </div>
              )}
            </button>

            <div
              onClick={() => navigate('/my-profile')}
              style={{
                width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
                overflow: 'hidden', flexShrink: 0,
                background: profile.avatar ? 'transparent' : profile.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.85rem', color: 'white',
                fontFamily: "'DM Sans', sans-serif",
                border: '2px solid #2a2a2a',
              }}
            >
              {profile.avatar
                ? <img src={profile.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : getInitials(profile.name)
              }
            </div>
          </div>
        </div>

        <div className="feed" id="main-feed" style={{ paddingBottom: '70px', background: 'var(--bg)' }}>
          <div className="category-tabs">
            <button className="cat-pill active">For You</button>
            <button className="cat-pill">Design</button>
            <button className="cat-pill">Technology</button>
            <button className="cat-pill">Culture</button>
          </div>

          <div style={{ padding: '0 16px' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                <p>Loading your feed...</p>
              </div>
            ) : (
              articles.map((article) => (
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
