import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SubscribeModal from './SubscribeModal';
import { useAuth } from '../context/AuthContext';
import { 
  followAuthor, 
  unfollowAuthor, 
  toggleLike, 
  toggleSave,
  isBlogLiked,
  isBlogSaved
} from '../utils/firebaseData';

export default function ArticleCard({ article, showToast }) {
  const navigate  = useNavigate();
  const { user } = useAuth();
  const id        = article.id;

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  
  // Initialization from Firestore
  useEffect(() => {
    if (user?.uid && id) {
      isBlogLiked(id, user.uid).then(setLiked);
      isBlogSaved(id, user.uid).then(setSaved);
    }
    // Local fallback for subscription for now
    const subs = JSON.parse(localStorage.getItem('inkwell_subscriptions') || '{}');
    setSubscribed(!!subs[article.authorId || article.name]);
  }, [user, id, article]);

  // Handle Like
  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) {
      showToast('Login to like this article');
      navigate('/login');
      return;
    }
    const result = await toggleLike(id, user.uid);
    if (!result.error) {
      setLiked(result.liked);
    }
  };

  // Handle Save
  const handleSave = async (e) => {
    e.stopPropagation();
    if (!user) {
      showToast('Login to save this article');
      navigate('/login');
      return;
    }
    const result = await toggleSave(id, user.uid);
    if (!result.error) {
      setSaved(result.saved);
      showToast(result.saved ? 'Saved to reading list' : 'Removed from saved');
    }
  };

  const handleSubscribe = (e) => {
    e.stopPropagation();
    if (subscribed) {
      setSubscribed(false);
      const subs = JSON.parse(localStorage.getItem('inkwell_subscriptions') || '{}');
      delete subs[article.authorId || article.name];
      localStorage.setItem('inkwell_subscriptions', JSON.stringify(subs));
      if (user?.uid && article.authorId) unfollowAuthor(user.uid, article.authorId);
      showToast('Unfollowed');
    } else {
      setShowModal(true);
    }
  };

  const [showModal, setShowModal] = useState(false);
  const confirmSubscribe = () => {
    setSubscribed(true);
    const authorKey = article.authorId || article.name;
    const subs = JSON.parse(localStorage.getItem('inkwell_subscriptions') || '{}');
    subs[authorKey] = true;
    localStorage.setItem('inkwell_subscriptions', JSON.stringify(subs));
    if (user?.uid && article.authorId) followAuthor(user.uid, article.authorId);
    setShowModal(false);
    showToast(`Following ${article.authorName || article.name}!`);
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.origin + `/article/${id}`);
    showToast('Link copied!');
  };

  const authorName   = article.authorName || article.name || 'Anonymous';
  const coverImg     = article.coverImage || article.cover_image || null;

  const openReader   = ()  => navigate(`/article/${id}`);
  const openComments = (e) => { e.stopPropagation(); navigate(`/comments/${id}`); };
  const openProfile  = (e) => { 
    e.stopPropagation(); 
    navigate(`/profile/${encodeURIComponent(authorName)}`, { 
      state: { 
        authorId: article.authorId,
        authorName: authorName,
        authorAvatar: coverImg || article.authorAvatar
      } 
    }); 
  };

  const getInitials = (name) => {
    if (!name) return 'A';
    const s = name.split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name[0].toUpperCase();
  };

  return (
    <>
      {showModal && (
        <SubscribeModal
          author={authorName}
          onClose={() => setShowModal(false)}
          onConfirm={confirmSubscribe}
        />
      )}
      <div className="chronicle-card" onClick={openReader}>
        {coverImg && (
          <div className="card-image-wrap">
            {article.id === 0 && <div className="editor-pick">Editor's Pick</div>}
            <img src={coverImg} className="cover-img" alt="cover" />
          </div>
        )}

        <div className="card-inner">
          <div className="card-author-row" onClick={openProfile} style={{ cursor: 'pointer' }}>
            <div className="author-letter-avatar">{getInitials(authorName)}</div>
            <span className="author-name-small">{authorName}</span>
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
                <span>{article.likesCount || 0}</span>
              </button>

              {/* Comments */}
              <button className="action-btn" onClick={openComments}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path>
                </svg>
                <span>{article.commentsCount || 0}</span>
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
