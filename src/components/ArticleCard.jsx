import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  toggleLike,
  subscribeToLikes,
  followUser,
  unfollowUser,
  isFollowing,
  toggleSavePost,
  isPostSaved,
} from '../utils/firebaseData';

const avatarColors = ['#cc4400','#2b9348','#7046a0','#1a6fa8','#c0392b','#16a085'];
const colorForName = (name) => avatarColors[(name||'A').charCodeAt(0) % avatarColors.length];

export default function ArticleCard({ article, showToast, isDashboard }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const id = article.id;

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [likesCount, setLikesCount] = useState(article.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(article.comments_count || 0);

  useEffect(() => {
    // SECURITY: If it's a mock post, skip real-time DB listeners
    if (!id || article.is_mock) return;

    const unsubLikes = subscribeToLikes(id, setLiked, setLikesCount, user?.uid);
    
    // Subscribe to post changes (for comment count and deletions)
    const unsubPost = onSnapshot(doc(db, 'posts', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCommentsCount(data.comments_count || 0);
      } else {
        // If it was a real post and is now gone, hide it
        setIsDeleted(true);
      }
    });

    return () => {
      unsubLikes();
      unsubPost();
    };
  }, [id, user?.uid, article.is_mock]);

  useEffect(() => {
    if (user?.uid && id) {
      // Check follow status
      isFollowing(user.uid, article.user_id).then(setSubscribed);
      
      // Check saved status
      isPostSaved(id, user.uid).then(setSaved);
    }
  }, [user?.uid, id, article.user_id]);

  if (isDeleted) return null;

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) { showToast('Login to like'); navigate('/login'); return; }
    await toggleLike(id, user.uid);
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!user) { showToast('Login to save'); navigate('/login'); return; }
    const { saved: newState, error } = await toggleSavePost(id, user.uid);
    if (!error) {
      setSaved(newState);
      showToast(newState ? 'Saved to bookmarks' : 'Removed from bookmarks');
    }
  };

  const handleSubscribe = async (e) => {
    e.stopPropagation();
    if (!user) { showToast('Login to follow'); navigate('/login'); return; }
    if (subscribed) {
      setSubscribed(false);
      await unfollowUser(user.uid, article.user_id);
      showToast('Unfollowed');
    } else {
      setSubscribed(true);
      await followUser(user.uid, article.user_id);
      showToast(`Following ${authorName}!`);
    }
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.origin + `/article/${id}`);
    showToast('Link copied!');
  };

  const authorName = article.profiles?.name || article.profiles?.username || 'Anonymous';
  const authorAvatar = article.profiles?.avatar_url || null;
  const coverImg = article.image_url || null;
  const dateStr = article.created_at ? new Date(article.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recently';

  const getInitials = (name) => {
    if (!name) return 'A';
    const s = name.split(' ');
    return s.length > 1 ? (s[0][0] + (s[1][0] || '')[0]).toUpperCase() : name[0].toUpperCase();
  };

  return (
    <div className="substack-card" onClick={() => navigate(`/article/${id}`)}>
      <div className="sc-header">
        <div className="sc-author-info" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${encodeURIComponent(authorName)}`, { state: { authorId: article.user_id } }); }}>
          <div className="sc-avatar">
            {authorAvatar ? <img src={authorAvatar} alt="av" /> : <div className="sc-initials" style={{ background: colorForName(authorName) }}>{getInitials(authorName)}</div>}
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

        <div className="sc-intent">
          {article.tagline || article.title}
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
             <p className="sc-excerpt">{article.tagline || (article.content ? article.content.substring(0, 100) + '...' : '')}</p>
          </div>

          <button className={`sc-save-btn ${saved ? 'active' : ''}`} onClick={handleSave}>
            <svg viewBox="0 0 24 24" fill={saved ? '#ff9500' : 'none'} stroke={saved ? '#ff9500' : 'currentColor'} strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>

        <div className="sc-actions">
           <button className={`sc-action-item ${liked ? 'active' : ''}`} onClick={handleLike}>
              <svg viewBox="0 0 24 24" fill={liked ? '#f91880' : 'none'} stroke={liked ? '#f91880' : 'currentColor'} strokeWidth="1.8" style={{ width: 22, height: 22 }}>
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.8 1.1-1.1a5.5 5.5 0 0 0 0-7.8z" />
              </svg>
              <span>{likesCount > 0 ? (likesCount > 999 ? (likesCount/1000).toFixed(1) + 'K' : likesCount) : ''}</span>
           </button>

           <button className="sc-action-item" onClick={(e) => { e.stopPropagation(); navigate(`/comments/${id}`); }}>
              <img src="/icons8-chat-96.png" alt="comments" style={{ width: 26, height: 26, opacity: 0.7, filter: 'brightness(1.2)' }} />
              <span>{commentsCount > 0 ? commentsCount : ''}</span>
           </button>

           <button className="sc-action-item" onClick={(e) => { e.stopPropagation(); showToast('Restacking coming soon!'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                 <path d="M17 1l4 4-4 4"></path>
                 <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                 <path d="M7 23l-4-4 4-4"></path>
                 <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
           </button>

           <button className="sc-action-item" onClick={handleCopy}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                 <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
           </button>
        </div>
      </div>
  );
}


