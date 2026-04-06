import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  followAuthor,
  unfollowAuthor,
  toggleLike,
  toggleSave,
  isBlogLiked,
  isBlogSaved,
  getFollowing,
  subscribeToLikesCount,
  subscribeToUserLike,
  subscribeToFollowingStatus,
  deleteBlog
} from '../utils/firebaseData';

const avatarColors = ['#cc4400','#2b9348','#7046a0','#1a6fa8','#c0392b','#16a085'];
const colorForName = (name) => avatarColors[(name||'A').charCodeAt(0) % avatarColors.length];

export default function ArticleCard({ article, showToast, isDashboard }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const id = article.id ? String(article.id) : null;

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(0);
  const [localCommentsCount, setLocalCommentsCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToLikesCount(id, setLocalLikesCount);
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    const unsub = subscribeToUserLike(id, user.uid, setLiked);
    return () => unsub && unsub();
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'blogs', id), (snap) => {
      if (!snap.exists()) setIsDeleted(true);
      else {
        const data = snap.data();
        setLocalCommentsCount(data.commentsCount || 0);
      }
    });
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (user?.uid && id) {
      isBlogSaved(id, user.uid).then(setSaved);
      // Real-time follow status sync
      const unsub = subscribeToFollowingStatus(user.uid, article.authorId, setSubscribed);
      return () => unsub && unsub();
    }
  }, [user?.uid, id, article.authorId]);

  if (isDeleted) return null;

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) { showToast('Login to like'); navigate('/login'); return; }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLocalLikesCount((prev) => (wasLiked ? Math.max(0, prev - 1) : prev + 1));
    await toggleLike(id, user.uid);
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!user) { showToast('Login to save'); navigate('/login'); return; }
    const result = await toggleSave(id, user.uid);
    if (!result.error) {
      setSaved(result.saved);
      showToast(result.saved ? 'Saved to reading list' : 'Removed from saved');
    }
  };

  const handleSubscribe = async (e) => {
    e.stopPropagation();
    if (!user) { showToast('Login to subscribe'); navigate('/login'); return; }
    if (subscribed) {
      setSubscribed(false);
      await unfollowAuthor(user.uid, article.authorId);
      showToast('Unfollowed');
    } else {
      setSubscribed(true);
      await followAuthor(user.uid, article.authorId);
      showToast(`Following ${authorName}!`);
    }
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.origin + `/article/${id}`);
    showToast('Link copied!');
  };

  const handleDeleteBlog = async (e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure?")) {
      const result = await deleteBlog(id);
      if (!result.error) showToast("Deleted");
    }
  };

  const authorName = article.authorName || article.name || 'Anonymous';
  const coverImg = article.coverImage || article.cover_image || null;
  const dateStr = article.createdAt?.toDate ? new Date(article.createdAt.toDate()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recently';

  const getInitials = (name) => {
    if (!name) return 'A';
    const s = name.split(' ');
    return s.length > 1 ? (s[0][0] + (s[1][0] || '')[0]).toUpperCase() : name[0].toUpperCase();
  };

  return (
    <div className="substack-card" onClick={() => navigate(`/article/${id}`)}>
      {/* Author Header */}
      <div className="sc-header">
        <div className="sc-author-info" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${encodeURIComponent(authorName)}`, { state: { authorId: article.authorId } }); }}>
          <div className="sc-avatar">
            {article.authorAvatar ? <img src={article.authorAvatar} alt="av" /> : <div className="sc-initials" style={{ background: colorForName(authorName) }}>{getInitials(authorName)}</div>}
          </div>
            <div className="sc-meta">
              <div className="sc-name">{authorName}</div>
              <div className="sc-submeta">
                <span>{dateStr}</span>
                <span className="dot">·</span>
                <button className={`sc-sub-link ${subscribed ? 'active' : ''}`} onClick={handleSubscribe}>
                  {subscribed ? 'Following' : 'Subscribe'}
                </button>
              </div>
            </div>
          </div>
          <div className="sc-brand-badge">
            <img src="/logo.png" alt="logo" style={{ width: 25, height: 25, borderRadius: 2 }} />
            <span>Inktrix</span>
          </div>
        </div>

        {/* Article Content Area */}
        <div className="sc-intent">
          {article.tagline || "One of the best articles I've read this year <3"}
        </div>

        <div className="sc-main-card">
          {coverImg && (
            <div className="sc-image-wrap">
              <img src={coverImg} alt="cover" />
              <div className="sc-img-overlay"></div>
            </div>
          )}
          
          <div className="sc-content-box">
             <div className="sc-pub-row">
                <div className="sc-pub-icon">🗞️</div>
                <span className="sc-pub-name">{article.category || 'Inktrix MAGAZINE'}</span>
             </div>
             <h2 className="sc-title">{article.title}</h2>
             <p className="sc-excerpt">{article.tagline}</p>
          </div>

          <button className="sc-save-btn" onClick={handleSave}>
            <svg viewBox="0 0 24 24" fill={saved ? 'var(--white)' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>

        {/* Interaction Bar */}
        <div className="sc-actions">
           <button className={`sc-action-item ${liked ? 'active' : ''}`} onClick={handleLike}>
              <svg viewBox="0 0 24 24" fill={liked ? '#f91880' : 'none'} stroke={liked ? '#f91880' : 'currentColor'} strokeWidth="1.8" style={{ width: 22, height: 22 }}>
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.8 1.1-1.1a5.5 5.5 0 0 0 0-7.8z" />
              </svg>
              <span>{localLikesCount > 0 ? (localLikesCount > 999 ? (localLikesCount/1000).toFixed(1) + 'K' : localLikesCount) : ''}</span>
           </button>

           <button className="sc-action-item" onClick={(e) => { e.stopPropagation(); navigate(`/comments/${id}`); }}>
              <img src="/icons8-chat-96.png" alt="comments" style={{ width: 26, height: 26, opacity: 0.7, filter: 'brightness(1.2)' }} />
              <span>{localCommentsCount > 0 ? localCommentsCount : ''}</span>
           </button>

           <button className="sc-action-item" onClick={(e) => { e.stopPropagation(); showToast('Restacking coming soon!'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                 <path d="M17 1l4 4-4 4"></path>
                 <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                 <path d="M7 23l-4-4 4-4"></path>
                 <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
              <span>{article.restacksCount || ''}</span>
           </button>

           <button className="sc-action-item" onClick={handleCopy}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                 <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
           </button>

           {user && article.authorId === user.uid && isDashboard && (
              <button className="sc-action-item delete" onClick={handleDeleteBlog} style={{ marginLeft: 'auto' }}>
                 <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ opacity: 0.5 }}>
                   <polyline points="3 6 5 6 21 6"></polyline>
                   <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                 </svg>
              </button>
           )}
        </div>
      </div>
  );
}
