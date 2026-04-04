import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { articles as mockArticles } from '../data';

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
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [focused, setFocused] = useState(false);
  const articles = mockArticles;

  const AUTHORS = useMemo(() => {
    const map = new Map();
    articles.forEach(a => {
      const name = a.author_name || a.name;
      if (!map.has(name)) {
        map.set(name, { name, count: 1 });
      } else {
        map.get(name).count++;
      }
    });
    return [...map.values()];
  }, [articles]);

  const q = query.toLowerCase().trim();

  const matchedArticles = useMemo(() => {
    return articles.filter(a => {
      const catMatch = activeCategory === 'All' ||
        (a.category || '').toLowerCase() === activeCategory.toLowerCase();
      const textMatch = !q ||
        a.title.toLowerCase().includes(q) ||
        (a.tagline || '').toLowerCase().includes(q) ||
        (a.author_name || a.name || '').toLowerCase().includes(q) ||
        (a.category || '').toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [q, activeCategory, articles]);

  const matchedAuthors = useMemo(() => {
    if (!q) return [];
    return AUTHORS.filter(a => a.name.toLowerCase().includes(q));
  }, [q, AUTHORS]);

  const isSearching = q.length > 0;

  return (
    <div className="view active search-page">
      <div className="app-shell" style={{ position: 'relative', background: '#0d0d0d' }}>

        <div className="search-header">
          <div className={`search-bar-wrap ${focused ? 'focused' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px', display: 'flex' }}
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 18, height: 18 }}>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </div>

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

        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          <div style={{ paddingBottom: 90 }}>
            {matchedAuthors.length > 0 && (
              <div style={{ padding: '4px 0 8px' }}>
                <div style={{ padding: '8px 20px 6px', fontSize: '0.7rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Authors
                </div>
                {matchedAuthors.map(a => (
                  <div
                    key={a.name}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 20px', cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/profile/${encodeURIComponent(a.name)}`)}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      background: colorFor(a.name), display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', color: 'white'
                    }}>
                      {getInitials(a.name)}
                    </div>
                    <div>
                      <div style={{ color: 'var(--white)', fontWeight: 600, fontSize: '0.95rem' }}>{a.name}</div>
                      <div style={{ color: '#555', fontSize: '0.8rem' }}>{a.count} article{a.count !== 1 ? 's' : ''}</div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" style={{ width: 16, height: 16, marginLeft: 'auto' }}>
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                ))}
                <div style={{ height: 1, background: '#1a1a1a', margin: '4px 0' }}></div>
              </div>
            )}

            {matchedArticles.length === 0 && matchedAuthors.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: '#555' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
                <div style={{ color: 'var(--white)', fontWeight: 600, marginBottom: 8 }}>No results found</div>
                <div style={{ fontSize: '0.9rem' }}>Try a different keyword or category</div>
              </div>
            )}

            {isSearching && matchedArticles.length > 0 && (
              <div style={{ padding: '8px 20px 4px', fontSize: '0.7rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Articles ({matchedArticles.length})
              </div>
            )}

            {!isSearching && matchedArticles[0] && (
              <div
                className="search-hero-card"
                onClick={() => navigate(`/article/${matchedArticles[0].id}`)}
              >
                <img src={matchedArticles[0].cover_image || matchedArticles[0].coverImage} className="hero-bg" alt="Cover" />
                <div className="hero-overlay"></div>
                <div className="hero-content">
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#e85d04', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    {matchedArticles[0].category}
                  </div>
                  <h2 className="hero-title">{matchedArticles[0].title}</h2>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
                    {matchedArticles[0].author_name || matchedArticles[0].name} · {matchedArticles[0].readTime || '4 min read'}
                  </div>
                </div>
              </div>
            )}

            <div className="search-feed-list">
              {(isSearching ? matchedArticles : matchedArticles.slice(1)).map(article => (
                <div
                  className="search-list-item"
                  key={article.id}
                  onClick={() => navigate(`/article/${article.id}`)}
                >
                  <div className="list-text-col">
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#e85d04', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      {article.category}
                    </div>
                    <h3 className="list-title">{article.title}</h3>
                    {article.tagline && (
                      <p style={{ fontSize: '0.8rem', color: '#666', marginTop: 4, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {article.tagline}
                      </p>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#555', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span
                        style={{ cursor: 'pointer', color: '#888' }}
                        onClick={e => { e.stopPropagation(); navigate(`/profile/${encodeURIComponent(article.author_name || article.name)}`); }}
                      >
                        {article.author_name || article.name}
                      </span>
                      <span>·</span>
                      <span>{article.readTime || '5 min read'}</span>
                    </div>
                  </div>
                  <div className="list-img-col">
                    {(article.cover_image || article.coverImage)
                      ? <img src={article.cover_image || article.coverImage} alt="thumbnail" />
                      : <div className="fallback-img">{article.title[0]}</div>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <BottomNav showToast={showToast} />
      </div>
    </div>
  );
}
