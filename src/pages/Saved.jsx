import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import ArticleCard from '../components/ArticleCard';
import { useAuth } from '../context/AuthContext';
import { subscribeToSavedBlogs } from '../utils/firebaseData';

export default function Saved({ showToast }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [savedArticles, setSavedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeToSavedBlogs(user.uid, (data) => {
      setSavedArticles(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const filters = ['All', 'Technology', 'Design', 'Productivity', 'Politics'];
  const filtered = activeFilter === 'All'
    ? savedArticles
    : savedArticles.filter(a =>
        (a.category || '').toLowerCase() === activeFilter.toLowerCase()
      );

  if (!user) {
    return (
      <div className="saved-page app-shell">
        <div className="saved-header">
          <h1 className="saved-title">Reading List</h1>
        </div>
        <div className="saved-empty">
          <div className="saved-empty-icon">🔐</div>
          <div className="saved-empty-title">Login required</div>
          <p className="saved-empty-sub">Please login to access and sync your personal reading list.</p>
          <button className="saved-browse-btn" onClick={() => navigate('/login')}>Log in</button>
        </div>
        <BottomNav showToast={showToast} />
      </div>
    );
  }

  return (
    <div className="saved-page app-shell">
      <div className="saved-header">
        <h1 className="saved-title">Reading List</h1>
      </div>

      <div className="saved-filters">
        {filters.map(f => (
          <button
            key={f}
            className={`saved-filter-pill ${activeFilter === f ? 'active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="saved-list">
        {loading ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: '#555' }}>🔄 Loading your list...</div>
        ) : filtered.length === 0 ? (
          <div className="saved-empty">
            <div className="saved-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div className="saved-empty-title">
              {activeFilter === 'All' ? 'No saved articles yet' : `No saved ${activeFilter} articles`}
            </div>
            <p className="saved-empty-sub">
              Tap the bookmark icon on any article to save it here forever.
            </p>
            <button className="saved-browse-btn" onClick={() => navigate('/home')}>
              Browse articles
            </button>
          </div>
        ) : (
          <div style={{ padding: '0 16px', paddingBottom: 90 }}>
            <div className="saved-count-row">
              <span className="saved-count">{filtered.length} article{filtered.length !== 1 ? 's' : ''} saved</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {filtered.map(a => (
                <ArticleCard key={a.id} article={a} showToast={showToast} />
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav showToast={showToast} />
    </div>
  );
}
