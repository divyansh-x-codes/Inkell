import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import ArticleCard from '../components/ArticleCard';
import { articles as mockArticles } from '../data';
import { getTotalUnread } from '../utils/unread';

const getInitials = (name) => {
  if (!name) return 'U';
  const s = name.trim().split(' ');
  return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name[0].toUpperCase();
};

export default function Home({ showToast }) {
  const navigate = useNavigate();
  const [articles] = useState(mockArticles);
  const [unread, setUnread] = useState(getTotalUnread);

  useEffect(() => {
    const refresh = () => setUnread(getTotalUnread());
    window.addEventListener('inkwell_unread_changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('inkwell_unread_changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  // Read saved user name from localStorage
  const savedName = localStorage.getItem('inkwell_user_name') || 'User';
  const initials = getInitials(savedName);

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
                background: '#1a9e6e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.85rem', color: 'white',
                fontFamily: "'DM Sans', sans-serif",
                border: '2px solid #2a2a2a',
              }}
            >
              {initials}
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
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} showToast={showToast} />
            ))}
          </div>
        </div>

        <BottomNav showToast={showToast} />
      </div>
    </div>
  );
}
