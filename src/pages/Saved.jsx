import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import ArticleCard from '../components/ArticleCard';
import { articles } from '../data';

function getStore(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}
function setStore(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

export default function Saved({ showToast }) {
  const navigate = useNavigate();

  const getSavedArticles = () => {
    const saves = getStore('inkwell_saves');
    return articles.filter(a => saves[a.id]);
  };

  const [savedArticles, setSavedArticles] = useState(getSavedArticles);
  const [activeFilter, setActiveFilter] = useState('All');

  // Refresh when focused
  useEffect(() => {
    setSavedArticles(getSavedArticles());
  }, []);

  const filters = ['All', 'Technology', 'Design', 'Productivity', 'Politics'];
  const filtered = activeFilter === 'All'
    ? savedArticles
    : savedArticles.filter(a =>
        (a.category || '').toLowerCase() === activeFilter.toLowerCase()
      );

  const clearAll = () => {
    setStore('inkwell_saves', {});
    setSavedArticles([]);
    showToast('Reading list cleared');
  };

  return (
    <div className="saved-page app-shell">
      {/* Header */}
      <div className="saved-header">
        <h1 className="saved-title">Reading List</h1>
        {savedArticles.length > 0 && (
          <button className="saved-clear-btn" onClick={clearAll}>Clear all</button>
        )}
      </div>

      {/* Filter pills */}
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

      {/* Content */}
      <div className="saved-list">
        {filtered.length === 0 ? (
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
              Tap the bookmark icon on any article to save it here.
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
