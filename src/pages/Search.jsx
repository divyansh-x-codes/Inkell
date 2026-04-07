import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['All', 'Technology', 'Design', 'Digital Media', 'Politics', 'Emerging Tech', 'Productivity'];

const getInitials = (name) => {
  if (!name) return 'A';
  const s = name.trim().split(' ');
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

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from('posts')
        .select('*, profiles(username, name, avatar_url)')
        .order('created_at', { ascending: false });
      setArticles(data || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const AUTHORS = useMemo(() => {
    const map = new Map();
    articles.forEach(a => {
      const profile = a.profiles || {};
      const name = profile.name || profile.username || 'Anonymous';
      const uid = a.user_id;
      if (!map.has(name)) {
        map.set(name, { name, uid, count: 1, avatar: profile.avatar_url });
      } else {
        map.get(name).count++;
        if (!map.get(name).uid && uid) map.get(name).uid = uid;
      }
    });
    return [...map.values()];
  }, [articles]);

  const q = query.toLowerCase().trim();

  const matchedArticles = useMemo(() => {
    return articles.filter(a => {
      const profile = a.profiles || {};
      const title = (a.title || '').toLowerCase();
      const author = (profile.name || profile.username || '').toLowerCase();
      const category = (a.category || '').toLowerCase();

      const catMatch = activeCategory === 'All' || category === activeCategory.toLowerCase();
      const textMatch = !q || title.includes(q) || author.includes(q) || category.includes(q);

      return catMatch && textMatch;
    });
  }, [q, activeCategory, articles]);

  const matchedAuthors = useMemo(() => {
    if (!q) return [];
    return AUTHORS.filter(a => (a.name || '').toLowerCase().includes(q));
  }, [q, AUTHORS]);

  const isSearching = q.length > 0;

  const handleDMAuthor = (e, author) => {
    e.stopPropagation();
    showToast('Direct messaging coming soon!');
  };

  return (
    <div className="view active search-page">
      <div className="app-shell" style={{ position: 'relative', background: '#0d0d0d' }}>
        <div className="search-header">
          <div className={`search-bar-wrap ${focused ? 'focused' : ''}`}>
             <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, marginRight: '8px' }} fill="var(--gray)"><path d="M21.414,18.586l-2.801-2.801C19.487,14.398,20,12.76,20,11c0-4.971-4.029-9-9-9s-9,4.029-9,9c0,4.971,4.029,9,9,9c1.761,0,3.398-0.513,4.785-1.387l2.801,2.801c0.781,0.781,2.047,0.781,2.828,0C22.195,20.633,22.195,19.367,21.414,18.586z M11,16 c-2.761,0-5-2.239-5-5s2.239-5,5-5s5,2.239,5,5S13.761,16,11,16z"/></svg>
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
              <button className="clear-search-btn" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 18, height: 18 }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            )}
          </div>
        </div>

        {!loading && (
          <div className="search-category-tabs">
            {CATEGORIES.map(cat => (
              <button key={cat} className={`search-cat-pill ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat}</button>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          <div style={{ paddingBottom: 90 }}>
            {loading ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: '#555' }}>Searching...</div>
            ) : (
              <>
                {matchedAuthors.length > 0 && (
                  <div style={{ padding: '4px 0 8px' }}>
                    <div className="search-section-label">Authors</div>
                    {matchedAuthors.map(a => (
                      <div key={a.name} className="author-search-item" onClick={() => navigate(`/profile/${encodeURIComponent(a.name)}`, { state: { authorId: a.uid } })}>
                        <div className="search-author-avatar" style={{ background: colorFor(a.name), overflow: 'hidden' }}>
                            {a.avatar ? <img src={a.avatar} alt="v" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : getInitials(a.name)}
                        </div>
                        <div className="search-author-info">
                          <div className="search-author-name">{a.name}</div>
                          <div className="search-author-meta">{a.count} article{a.count !== 1 ? 's' : ''}</div>
                        </div>
                        {a.uid !== user?.id && (
                          <button className="search-dm-btn" onClick={(e) => handleDMAuthor(e, a)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ width: 15, height: 15 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {matchedArticles.length === 0 && matchedAuthors.length === 0 && (
                   <div style={{ textAlign: 'center', padding: '100px 40px', color: '#555' }}>
                     <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🔍</div>
                     <div style={{ color: 'var(--white)', fontWeight: 700, fontSize: '1.2rem' }}>No results found</div>
                   </div>
                )}

                {isSearching && matchedArticles.length > 0 && <div className="search-section-label">Articles ({matchedArticles.length})</div>}

                {!isSearching && matchedArticles[0] && (
                  <div className="search-hero-card" onClick={() => navigate(`/article/${matchedArticles[0].id}`)}>
                    <img src={matchedArticles[0].image_url} className="hero-bg" alt="Cover" />
                    <div className="hero-overlay"></div>
                    <div className="hero-content">
                      <div className="hero-category-tag">{matchedArticles[0].category || 'Article'}</div>
                      <h2 className="hero-title">{matchedArticles[0].title}</h2>
                      <div className="hero-meta">{matchedArticles[0].profiles?.name || matchedArticles[0].profiles?.username} · 5 min read</div>
                    </div>
                  </div>
                )}

                <div className="search-feed-list">
                  {(isSearching ? matchedArticles : matchedArticles.slice(1)).map(article => (
                    <div className="search-list-item" key={article.id} onClick={() => navigate(`/article/${article.id}`)}>
                      <div className="list-text-col">
                        <div className="list-category-tag">{article.category || 'Post'}</div>
                        <h3 className="list-title">{article.title}</h3>
                        <div className="list-meta-row">
                          <span className="list-author-link" onClick={e => { e.stopPropagation(); navigate(`/profile/${encodeURIComponent(article.profiles?.name || article.profiles?.username)}`, { state: { authorId: article.user_id } }); }}>{article.profiles?.name || article.profiles?.username}</span>
                          <span className="dot">·</span>
                          <span className="list-time">4 min read</span>
                        </div>
                      </div>
                      <div className="list-img-col">
                         {article.image_url ? <img src={article.image_url} alt="tn" /> : <div className="fallback-img">{article.title[0]}</div>}
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

