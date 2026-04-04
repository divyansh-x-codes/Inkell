import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import SubscribeModal from './SubscribeModal';
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
  subscribeToUserLike
} from '../utils/firebaseData';

export default function ArticleCard({ article, showToast, isDashboard }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const id = article.id;

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(0);
  const [localCommentsCount, setLocalCommentsCount] = useState(0);

  // 0. Real-time Subscriptions (Proper Pattern)
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

  // Real-time deletion handle (Minimalist)
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

  if (isDeleted) return null;

  // 1. Precise Social State from Firestore
  useEffect(() => {
    if (user?.uid && id) {
      isBlogSaved(id, user.uid).then(setSaved);
      getFollowing(user.uid).then(following => {
        setSubscribed(following.includes(article.authorId));
      });
    }
  }, [user, id, article.authorId]);

  // Handle Like (Optimistic & Proper)
  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) {
      showToast('Login to like this article');
      navigate('/login');
      return;
    }

    // Optimistic UI (instant feel)
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLocalLikesCount((prev) => (wasLiked ? Math.max(0, prev - 1) : prev + 1));

    await toggleLike(id, user.uid);
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

  const handleSubscribe = async (e) => {
    e.stopPropagation();
    if (!user) {
      showToast('Login to subscribe');
      navigate('/login');
      return;
    }

    if (subscribed) {
      setSubscribed(false);
      await unfollowAuthor(user.uid, article.authorId);
      showToast('Unfollowed');
    } else {
      setShowModal(true);
    }
  };

  const [showModal, setShowModal] = useState(false);
  const confirmSubscribe = async () => {
    setSubscribed(true);
    await followAuthor(user.uid, article.authorId);
    setShowModal(false);
    showToast(`Following ${article.authorName || article.name}!`);
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.origin + `/article/${id}`);
    showToast('Link copied!');
  };

  const handleDeleteBlog = async (e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this article?")) {
      const result = await deleteBlog(id);
      if (result.error) {
        showToast("Failed to delete article");
      } else {
        showToast("Article deleted");
      }
    }
  };

  const authorName = article.authorName || article.name || 'Anonymous';
  const coverImg = article.coverImage || article.cover_image || null;

  const openReader = () => navigate(`/article/${id}`);
  const openComments = (e) => { e.stopPropagation(); navigate(`/comments/${id}`); };
  const openProfile = (e) => {
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
      <div className="chronicle-card" style={{ display: isDeleted ? 'none' : 'block' }} onClick={openReader}>
        {coverImg && (
          <div className="card-image-wrap">
            {article.isEditorPick && <div className="editor-pick">Editor's Pick</div>}
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
            <div className="interaction-group">
              {/* Like */}
              <button
                className={`action-item like ${liked ? 'liked' : ''}`}
                onClick={handleLike}
                title="Like"
              >
                <div className="action-icon-wrap">
                  <svg viewBox="0 0 24 24">
                    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.8 1.1-1.1a5.5 5.5 0 0 0 0-7.8z" />
                  </svg>
                </div>
                <span>{localLikesCount || 0}</span>
              </button>

              {/* Comment */}
              <button
                className="action-item comment"
                onClick={openComments}
                title="Comment"
              >
                <div className="action-icon-wrap">
                  <svg viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
                  </svg>
                </div>
                <span>{localCommentsCount || 0}</span>
              </button>

              {/* Bookmark */}
              <button
                className={`action-item save ${saved ? 'saved' : ''}`}
                onClick={handleSave}
                title="Save"
              >
                <div className="action-icon-wrap">
                  <svg viewBox="0 0 24 24">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
              </button>

              {/* Share */}
              <button
                className="action-item share"
                onClick={handleCopy}
                title="Share"
              >
                <div className="action-icon-wrap">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
                  </svg>
                </div>
              </button>

              {/* Delete (Owner only in Dashboard) */}
              {user && article.authorId === user.uid && isDashboard && (
                <button
                  className="action-item delete"
                  onClick={handleDeleteBlog}
                  title="Delete Post"
                  style={{ marginLeft: 'auto' }}
                >
                  <div className="action-icon-wrap">
                    <svg viewBox="0 0 24 24" style={{ opacity: 0.6 }}>
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
