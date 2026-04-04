import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { articles as mockArticles } from '../data';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';

function Poll({ poll, showToast }) {
  const [voted, setVoted] = useState(false);

  const handleVote = () => {
    if (voted) return;
    setVoted(true);
    showToast('Vote recorded!');
  };

  return (
    <div className="reader-poll-card">
      <div className="poll-label">POLL</div>
      <div className="poll-q">{poll.q}</div>
      {poll.options.map((o, i) => (
        <div key={i} className="poll-option" onClick={handleVote}>
          <div className="poll-fill" style={{ width: voted ? `${o.pct}%` : '0%' }}></div>
          <div className="poll-row">
            <span className="poll-text">{o.text}</span>
            <span className="poll-pct">{o.pct}%</span>
          </div>
        </div>
      ))}
      <div className="poll-closed">{voted ? 'THANKS FOR VOTING' : 'POLL CLOSED'}</div>
    </div>
  );
}

export default function Reader({ showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  const getLS  = (k) => { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch { return {}; } };
  const setLS  = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    const art = mockArticles.find(a => String(a.id) === String(id));
    if (art) {
      setArticle(art);
      setLikesCount(parseInt(art.likes) || 0);
      setLiked(!!getLS('inkwell_likes')[art.id]);
      setSaved(!!getLS('inkwell_saves')[art.id]);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!article) return;
    try {
      const reads = JSON.parse(localStorage.getItem('inkwell_reads') || '{}');
      reads[article.id] = true;
      localStorage.setItem('inkwell_reads', JSON.stringify(reads));
    } catch {}
  }, [article]);

  if (loading) return null;
  if (!article) return <div style={{ color: 'white', padding: '20px' }}>Article not found</div>;

  const getInitials = (name) => {
    if (!name) return 'A';
    const split = name.split(' ');
    if (split.length > 1) {
      return (split[0][0] + split[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const handleLike = () => {
    if (!article) return;
    const next  = !liked;
    const nextN = next ? likesCount + 1 : likesCount - 1;
    setLiked(next);
    setLikesCount(nextN);
    
    // Sync to local for now (Supabase sync for likes can be added in schema later)
    const likes  = getLS('inkwell_likes');
    next ? (likes[article.id] = true) : delete likes[article.id];
    setLS('inkwell_likes', likes);
  };

  const handleSave = () => {
    if (!article) return;
    const next = !saved;
    setSaved(next);
    const saves = getLS('inkwell_saves');
    next ? (saves[article.id] = true) : delete saves[article.id];
    setLS('inkwell_saves', saves);
    showToast(next ? 'Saved to reading list' : 'Removed from saved');
  };

  const authorName = article.author_name || article.name || 'Anonymous';

  return (
    <div className="view active reader-page">
      <div className="app-shell" style={{ background: '#121212', position: 'relative' }}>
        
        <div className="reader-topbar">
          <button className="tb-circle-btn" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <div className="tb-right-actions">
            <button className="tb-circle-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </button>
            <button className="tb-circle-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"></path>
              </svg>
            </button>
            <button className="tb-circle-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.5"></circle>
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="19" cy="12" r="1.5"></circle>
              </svg>
            </button>
          </div>
        </div>
        
        <div className="reader-scroll-area">
          <div className="reader-pub">{article.pub_date || article.pub || article.category}</div>
          <h1 className="reader-title">{article.title}</h1>
          <p className="reader-tagline">{article.tagline}</p>
          
          <div className="reader-author-row" onClick={() => navigate(`/profile/${encodeURIComponent(authorName)}`)} style={{cursor: 'pointer'}}>
            <div className="reader-author-details">
              <div className="reader-author-name">{authorName.toUpperCase()}</div>
              <div className="reader-author-date">
                {new Date(article.created_at || Date.now()).toLocaleDateString() || article.date} 2026 AT 5:33 PM
              </div>
            </div>
            <div className="reader-avatar" style={{background: '#cc4400'}}>
              {getInitials(authorName)}
            </div>
          </div>
          
          <div className="reader-divider"></div>
          
          {article.hasPoll && article.poll && <Poll poll={article.poll} showToast={showToast} />}
          
          <div className="reader-body">
            {(article.cover_image || article.coverImage) && <img src={article.cover_image || article.coverImage} className="reader-hero-img" alt="cover" />}
            <div dangerouslySetInnerHTML={{ __html: article.body }} />
          </div>
        </div>

        <div className="reader-floating-bar-wrapper">
          <div className="reader-floating-pill">
            <button className="floating-action-btn" onClick={handleLike}>
              <svg viewBox="0 0 24 24" fill={liked ? "var(--orange)" : "none"} stroke={liked ? "var(--orange)" : "currentColor"} strokeWidth="2">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.8 1.1-1.1a5.5 5.5 0 0 0 0-7.8z"></path>
              </svg>
              <span>{likesCount}</span>
            </button>
            <button className="floating-action-btn" onClick={() => navigate(`/comments/${article.id}`)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path>
              </svg>
              <span>{article.comments_count || 0}</span>
            </button>
            <button className="floating-action-btn" onClick={handleSave}>
              <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
            <button className="floating-action-btn" onClick={() => showToast('Shared link')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"></path>
              </svg>
            </button>
          </div>
        </div>

        <BottomNav showToast={showToast} currentPath={null} />
      </div>
    </div>
  );
}
