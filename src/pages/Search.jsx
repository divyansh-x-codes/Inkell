import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { fetchArticles, getConversationId, searchUsersByName } from '../utils/firebaseData';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['All', 'Technology', 'Design', 'Digital Media', 'Politics', 'Emerging Tech', 'Productivity'];

const getInitials = (name) => {
  if (!name) return 'A';
  const s = name.split(' ');
  return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name[0].toUpperCase();
};
const authorColors = ['#cc4400', '#2b9348', '#1a6fa8', '#7046a0', '#c0392b'];
const colorFor = (name) => authorColors[(name || 'A').charCodeAt(0) % authorColors.length];

export default function Search({ showToast }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [focused, setFocused] = useState(false);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch with Error Resilience
  useEffect(() => {
    fetchArticles().then(data => {
      const validData = (data || []).filter(item => item && item.title);
      setArticles(validData);
      setLoading(false);
    }).catch(err => {
      console.error("Search fetch failed", err);
      setLoading(false);
    });
  }, []);

  // 2. Authors Memo with authorId tracking
  const AUTHORS = useMemo(() => {
    const map = new Map();
    articles.forEach(a => {
      const name = a.authorName || a.author_name || a.name || 'Anonymous';
      const authorId = a.authorId || null;
      if (!map.has(name)) {
        map.set(name, { name, authorId, count: 1 });
      } else {
        map.get(name).count++;
        if (!map.get(name).authorId && authorId) map.get(name).authorId = authorId;
      }
    });
    return [...map.values()];
  }, [articles]);

  const q = query.toLowerCase().trim();

  // 3. Matched Articles with Defensive Access
  const matchedArticles = useMemo(() => {
    return articles.filter(a => {
      const title = (a.title || '').toLowerCase();
      const tagline = (a.tagline || '').toLowerCase();
      const author = (a.authorName || a.author_name || a.name || '').toLowerCase();
      const category = (a.category || '').toLowerCase();

      const catMatch = activeCategory === 'All' || category === activeCategory.toLowerCase();
      const textMatch = !q || title.includes(q) || tagline.includes(q) || author.includes(q) || category.includes(q);

      return catMatch && textMatch;
    });
  }, [q, activeCategory, articles]);

  // 4. Matched Authors
  const matchedAuthors = useMemo(() => {
    if (!q) return [];
    return AUTHORS.filter(a => (a.name || '').toLowerCase().includes(q));
  }, [q, AUTHORS]);

  const isSearching = q.length > 0;

  // DM an author from search
  const handleDMAuthor = (e, author) => {
    e.stopPropagation();
    if (!user) { showToast('Login to message authors'); navigate('/login'); return; }
    if (!author.authorId) {
      showToast('Cannot message this author yet');
      return;
    }
    if (author.authorId === user.uid) { showToast("That's you!"); return; }
    const convoId = getConversationId(user.uid, author.authorId);
    navigate(`/chat/${convoId}`, {
      state: {
        recipientUserId: author.authorId,
        recipientName: author.name,
        recipientAvatar: null,
      }
    });
  };

  return (
    <div className="view active search-page">
      <div className="app-shell" style={{ position: 'relative', background: '#0d0d0d' }}>

        {/* Search Header */}
        <div className="search-header">
          <div className={`search-bar-wrap ${focused ? 'focused' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20, color: 'var(--gray2)', marginRight: '8px' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Search articles, authors, topics…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            {query && (
              <button
                className="clear-search-btn"
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                style={{ marginLeft: '8px' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 18, height: 18 }}>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        {!loading && (
          <div className="search-category-tabs">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`search-cat-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          <div style={{ paddingBottom: 90 }}>

            {loading ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: '#333' }}>
                <div className="search-loading-spinner" style={{ marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: '0.9rem' }}>Searching the collective...</div>
              </div>
            ) : (
              <>
                {/* Matched Authors Section */}
                {matchedAuthors.length > 0 && (
                  <div style={{ padding: '4px 0 8px' }}>
                    <div className="search-section-label">Authors</div>
                    {matchedAuthors.map(a => (
                      <div
                        key={a.name}
                        className="author-search-item"
                        onClick={() => navigate(`/profile/${encodeURIComponent(a.name)}`, { state: { authorId: a.authorId } })}
                      >
                        <div className="search-author-avatar" style={{ background: colorFor(a.name) }}>
                          {getInitials(a.name)}
                        </div>
                        <div className="search-author-info">
                          <div className="search-author-name">{a.name}</div>
                          <div className="search-author-meta">{a.count} article{a.count !== 1 ? 's' : ''}</div>
                        </div>

                        {/* DM button on author card */}
                        {a.authorId && a.authorId !== user?.uid && (
                          <button
                            className="search-dm-btn"
                            onClick={(e) => handleDMAuthor(e, a)}
                            title={`Message ${a.name}`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ width: 15, height: 15 }}>
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                          </button>
                        )}

                        <svg viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" style={{ width: 14, height: 14, marginLeft: 6, flexShrink: 0 }}>
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    ))}
                    <div className="search-divider"></div>
                  </div>
                )}

                {/* Empty State */}
                {matchedArticles.length === 0 && matchedAuthors.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '100px 40px', color: '#555' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🔍</div>
                    <div style={{ color: 'var(--white)', fontWeight: 700, fontSize: '1.2rem', marginBottom: 8 }}>No results found</div>
                    <div style={{ fontSize: '0.9rem', color: '#666', maxWidth: 220, margin: '0 auto' }}>
                      We couldn't find matches for <span style={{ color: 'var(--orange)' }}>"{query}"</span>
                    </div>
                  </div>
                )}

                {/* Section Title */}
                {isSearching && matchedArticles.length > 0 && (
                  <div className="search-section-label">Articles ({matchedArticles.length})</div>
                )}

                {/* Hero Card (when not searching) */}
                {!isSearching && matchedArticles[0] && (
                  <div
                    className="search-hero-card"
                    onClick={() => navigate(`/article/${matchedArticles[0].id}`)}
                  >
                    <img src={matchedArticles[0].coverImage || matchedArticles[0].cover_image} className="hero-bg" alt="Cover" />
                    <div className="hero-overlay"></div>
                    <div className="hero-content">
                      <div className="hero-category-tag">{matchedArticles[0].category}</div>
                      <h2 className="hero-title">{matchedArticles[0].title}</h2>
                      <div className="hero-meta">
                        {matchedArticles[0].authorName || matchedArticles[0].author_name || matchedArticles[0].name} · {matchedArticles[0].readTime || '4 min read'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Article List */}
                <div className="search-feed-list">
                  {(isSearching ? matchedArticles : matchedArticles.slice(1)).map(article => (
                    <div
                      className="search-list-item"
                      key={article.id}
                      onClick={() => navigate(`/article/${article.id}`)}
                    >
                      <div className="list-text-col">
                        <div className="list-category-tag">{article.category}</div>
                        <h3 className="list-title">{article.title}</h3>
                        {article.tagline && (
                          <p className="list-excerpt">{article.tagline}</p>
                        )}
                        <div className="list-meta-row">
                          <span
                            className="list-author-link"
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/profile/${encodeURIComponent(article.authorName || article.author_name || article.name)}`, {
                                state: { authorId: article.authorId }
                              });
                            }}
                          >
                            {article.authorName || article.author_name || article.name}
                          </span>
                          <span className="dot">·</span>
                          <span className="list-time">{article.readTime || '5 min read'}</span>
                        </div>
                      </div>
                      <div className="list-img-col">
                        {(article.coverImage || article.cover_image)
                          ? <img src={article.coverImage || article.cover_image} alt="thumbnail" />
                          : <div className="fallback-img">{article.title[0]}</div>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <BottomNav showToast={showToast} />
      </div>
    </div>
  );
}
