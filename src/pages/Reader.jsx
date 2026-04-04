import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { articles as mockArticles } from '../data';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  toggleLike,
  toggleSave,
  isBlogLiked,
  isBlogSaved,
  subscribeToLikesCount,
  subscribeToUserLike
} from '../utils/firebaseData';

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

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  // 1. Real-time article data subscription (Comments/Content)
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const unsubscribe = onSnapshot(doc(db, 'blogs', id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setArticle(data);
        // Comments count is synced from the doc real-time
        setLoading(false);
      } else {
        // Fallback to mock if not found in Firestore
        const art = mockArticles.find(a => String(a.id) === String(id));
        if (art) {
          setArticle(art);
        }
        setLoading(false);
      }
    }, (err) => {
      console.error("Real-time reader error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  // 1b. Real-time Likes Count subscription
  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToLikesCount(id, setLikesCount);
    return () => unsub();
  }, [id]);

  // 1c. Real-time User Like status subscription
  useEffect(() => {
    if (!user || !id) return;
    const unsub = subscribeToUserLike(id, user.uid, setLiked);
    return () => unsub && unsub();
  }, [id, user]);

  // 2. Load user-specific interaction status (Saves) from Firestore
  useEffect(() => {
    if (user?.uid && id) {
      isBlogSaved(id, user.uid).then(setSaved);
    }
  }, [user, id]);

  const handleLike = async () => {
    if (!user) {
      showToast('Login to like articles');
      navigate('/login');
      return;
    }

    // --- OPTIMISTIC UPDATE ---
    const wasLiked = liked;
    const newLiked = !wasLiked;
    setLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

    const result = await toggleLike(id, user.uid);
    if (result.error) {
      showToast('Like failed');
      // Rollback
      setLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  const handleSave = async () => {
    if (!user) {
      showToast('Login to save articles');
      navigate('/login');
      return;
    }

    // --- OPTIMISTIC UPDATE ---
    const wasSaved = saved;
    const newSaved = !wasSaved;
    setSaved(newSaved);
    showToast(newSaved ? 'Saved to reading list' : 'Removed from saved');

    const result = await toggleSave(id, user.uid);
    if (result.error) {
      showToast('Save failed');
      // Rollback
      setSaved(wasSaved);
    }
  };

  if (loading && !article) return (
    <div style={{ background: '#121212', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
      Loading story...
    </div>
  );

  if (!article) return (
    <div style={{ background: '#121212', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📄🚫</div>
      <h2 style={{ color: 'white', marginBottom: '12px' }}>Article not found</h2>
      <p style={{ color: '#666', marginBottom: '32px' }}>This story might have been removed or the link is incorrect.</p>
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'var(--orange)', color: 'white', border: 'none',
          padding: '14px 28px', borderRadius: '12px', fontWeight: 700,
          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif"
        }}
      >
        Back to Home
      </button>
    </div>
  );

  const authorName = article.authorName || article.name || 'Anonymous';

  const getInitials = (name) => {
    if (!name) return 'A';
    const split = name.split(' ');
    if (split.length > 1) {
      return (split[0][0] + split[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <div className="view active reader-page">
      <div className="app-shell" style={{ background: '#121212', position: 'relative' }}>

        <div className="reader-topbar">
          <button className="tb-circle-btn" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <div className="tb-right-actions" style={{ gap: 8 }}>
            {user && article && user.uid === article.authorId && (
              <button
                className="tb-circle-btn edit-btn"
                onClick={() => navigate(`/edit-article/${article.id}`)}
                style={{ color: 'var(--orange)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 18, height: 18 }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path>
                </svg>
              </button>
            )}
            <button className="tb-circle-btn" onClick={() => showToast('Options')}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.5"></circle>
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="19" cy="12" r="1.5"></circle>
              </svg>
            </button>
          </div>
        </div>

        <div className="reader-scroll-area">
          <div className="reader-pub">{article.category || 'Article'}</div>
          <h1 className="reader-title">{article.title}</h1>
          <p className="reader-tagline">{article.tagline}</p>

          <div className="reader-author-row" onClick={() => navigate(`/profile/${encodeURIComponent(authorName)}`, { state: { authorId: article.authorId } })} style={{ cursor: 'pointer' }}>
            <div className="reader-author-details">
              <div className="reader-author-name">{authorName.toUpperCase()}</div>
              <div className="reader-author-date">
                {article.createdAt?.toDate ? new Date(article.createdAt.toDate()).toLocaleDateString() : 'Published recently'}
              </div>
            </div>
            <div className="reader-avatar" style={{ background: '#cc4400' }}>
              {getInitials(authorName)}
            </div>
          </div>

          <div className="reader-divider"></div>

          <div className="reader-body">
            {(article.coverImage || article.cover_image) && <img src={article.coverImage || article.cover_image} className="reader-hero-img" alt="cover" />}
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#ccc', paddingBottom: '120px' }}>{article.content || article.body || ''}</div>
          </div>
        </div>

        <div className="reader-floating-bar-wrapper">
          <div className="reader-floating-pill">
            <button className={`floating-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
              <svg viewBox="0 0 24 24" fill={liked ? 'var(--heart-red)' : 'none'} stroke={liked ? 'var(--heart-red)' : 'currentColor'} strokeWidth="1.75">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.8 1.1-1.1a5.5 5.5 0 0 0 0-7.8z" />
              </svg>
              <span>{likesCount}</span>
            </button>
            <button className="floating-action-btn" onClick={() => navigate(`/comments/${article.id}`)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M21 15v4a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
              </svg>
              <span>{article.commentsCount || 0}</span>
            </button>
            <button className={`floating-action-btn ${saved ? 'saved' : ''}`} onClick={handleSave}>
              <svg viewBox="0 0 24 24" fill={saved ? 'var(--save-blue)' : 'none'} stroke={saved ? 'var(--save-blue)' : 'currentColor'} strokeWidth="1.75">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            <button className="floating-action-btn" onClick={() => { navigator.clipboard.writeText(window.location.href); showToast('Link copied!'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
            </button>
          </div>
        </div>

        <BottomNav showToast={showToast} currentPath={null} />
      </div>
    </div>
  );
}
