import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SubscribeModal from './SubscribeModal';

// ── Shared localStorage helpers ─────────────────────────────
function getStore(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}
function setStore(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

export default function ArticleCard({ article, showToast }) {
  const navigate  = useNavigate();
  const id        = article.id;

  // ── Initialise all states from localStorage ──────────────
  const [liked, setLiked] = useState(() => !!getStore('inkwell_likes')[id]);
  const [saved, setSaved] = useState(() => !!getStore('inkwell_saves')[id]);
  const [subscribed, setSubscribed] = useState(() =>
    !!getStore('inkwell_subscriptions')[article.name]
  );
  const [likesCount, setLikesCount] = useState(() => {
    const stored = getStore('inkwell_like_counts')[id];
    return stored !== undefined ? stored : article.likes;
  });
  const [showModal, setShowModal] = useState(false);

  // ── Handlers ─────────────────────────────────────────────
  const handleLike = (e) => {
    e.stopPropagation();
    const next   = !liked;
    const nextN  = typeof likesCount === 'number'
      ? (next ? likesCount + 1 : likesCount - 1)
      : likesCount;

    setLiked(next);
    setLikesCount(nextN);

    const likes  = getStore('inkwell_likes');
    const counts = getStore('inkwell_like_counts');
    next ? (likes[id] = true) : delete likes[id];
    counts[id] = nextN;
    setStore('inkwell_likes', likes);
    setStore('inkwell_like_counts', counts);
  };

  const handleSave = (e) => {
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    const saves = getStore('inkwell_saves');
    next ? (saves[id] = true) : delete saves[id];
    setStore('inkwell_saves', saves);
    showToast(next ? 'Saved to reading list' : 'Removed from saved');
  };

  const handleSubscribe = (e) => {
    e.stopPropagation();
    if (subscribed) {
      // Already subscribed — toggle off
      setSubscribed(false);
      const subs = getStore('inkwell_subscriptions');
      delete subs[article.name];
      setStore('inkwell_subscriptions', subs);
      showToast('Unsubscribed');
    } else {
      setShowModal(true);
    }
  };

  const confirmSubscribe = () => {
    setSubscribed(true);
    const subs = getStore('inkwell_subscriptions');
    subs[article.name] = true;
    setStore('inkwell_subscriptions', subs);
    setShowModal(false);
    showToast(`You'll be notified when ${article.name}'s newsletter launches!`);
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    showToast('Link copied!');
  };

  const openReader   = ()  => navigate(`/article/${id}`);
  const openComments = (e) => { e.stopPropagation(); navigate(`/comments/${id}`); };
  const openProfile  = (e) => { e.stopPropagation(); navigate(`/profile/${encodeURIComponent(article.name)}`); };

  const getInitials = (name) => {
    if (!name) return 'A';
    const s = name.split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name[0].toUpperCase();
  };

  return (
    <>
      {showModal && (
        <SubscribeModal
          author={article.name}
          onClose={() => setShowModal(false)}
          onConfirm={confirmSubscribe}
        />
      )}
      <div className="chronicle-card" onClick={openReader}>
      {article.coverImage && (
        <div className="card-image-wrap">
          {article.id === 0 && <div className="editor-pick">Editor's Pick</div>}
          <img src={article.coverImage} className="cover-img" alt="cover" />
        </div>
      )}

      <div className="card-inner">
        <div className="card-author-row" onClick={openProfile} style={{ cursor: 'pointer' }}>
          <div className="author-letter-avatar">{getInitials(article.name)}</div>
          <span className="author-name-small">{article.name}</span>
          <span className="dot">·</span>
          <span className="author-time">{article.readTime || '5 min read'}</span>
          <span className="dot">·</span>
          <button
            className={`subscribe-btn ${subscribed ? 'following' : ''}`}
            onClick={handleSubscribe}
          >
            {subscribed ? 'Following' : 'Subscribe'}
          </button>
        </div>

        <div className="card-text-content">
          <h2 className="card-title">{article.title}</h2>
          {article.tagline && <p className="card-excerpt">{article.tagline}</p>}
        </div>

        <div className="card-divider"></div>

        <div className="card-bottom-actions">
          <div className="actions-left">
            {/* Like */}
            <button className={`action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
              <svg viewBox="0 0 24 24" fill={liked ? 'var(--orange)' : 'none'} stroke={liked ? 'var(--orange)' : 'currentColor'} strokeWidth="2">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.8 1.1-1.1a5.5 5.5 0 0 0 0-7.8z"></path>
              </svg>
              <span>{likesCount}</span>
            </button>

            {/* Comments */}
            <button className="action-btn" onClick={openComments}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path>
              </svg>
              <span>
                {typeof article.comments === 'number'
                  ? article.comments + (article.commentsList?.length || 0)
                  : article.comments}
              </span>
            </button>
          </div>

          <div className="actions-right">
            {/* Bookmark */}
            <button className={`action-btn ${saved ? 'saved' : ''}`} onClick={handleSave}>
              <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>

            {/* Share */}
            <button className="action-btn" onClick={handleCopy}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
