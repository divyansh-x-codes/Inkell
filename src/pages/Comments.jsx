import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToComments, addComment, fetchArticles } from '../utils/firebaseData';

const getInitials = (name) => {
  if (!name) return 'U';
  const s = name.trim().split(' ');
  return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name[0].toUpperCase();
};

const avatarColors = ['#cc4400', '#2b9348', '#7046a0', '#1a6fa8', '#c0392b', '#16a085'];
const colorForName = (name) => avatarColors[(name || 'A').charCodeAt(0) % avatarColors.length];

export default function Comments({ showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load article details
  useEffect(() => {
    fetchArticles().then(articles => {
      const art = articles.find(a => String(a.id) === String(id));
      setArticle(art);
    });
  }, [id]);

  // Real-time comments subscription
  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeToComments(id, (data) => {
      setComments(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) {
      showToast('Please login to comment');
      navigate('/login');
      return;
    }

    const result = await addComment(id, newComment.trim(), user);
    if (!result.error) {
      setNewComment('');
      showToast('Comment posted!');
    } else {
      showToast('Failed to post comment');
    }
  };

  if (!article && !loading) return <div style={{ padding: '20px', color: 'white' }}>Article not found</div>;

  const authorName = article?.authorName || article?.name || 'Author';

  return (
    <div className="view active comments-page">
      <div className="comments-header">
        <button className="back-circle-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h2 className="header-title">Comments ({comments.length})</h2>
        <div style={{ width: '38px' }}></div>
      </div>

      <div className="comments-scroll-area">
        {article && (
          <div className="original-note-context">
            <div className="note-author-row">
              <div
                className="author-letter-avatar"
                style={{ width: 40, height: 40, background: colorForName(authorName), cursor: 'pointer' }}
                onClick={() => navigate(`/profile/${encodeURIComponent(authorName)}`)}
              >
                {getInitials(authorName)}
              </div>
              <div className="note-author-info" style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${encodeURIComponent(authorName)}`)}>
                <div className="note-author-name">{authorName}</div>
                <div className="note-meta">{article.category} · {article.readTime}</div>
              </div>
            </div>
            <div style={{ fontSize: '1.05rem', marginTop: '12px', color: 'var(--white)', lineHeight: 1.4 }}>
              {article.title}
            </div>
          </div>
        )}

        <div style={{ height: '1px', background: '#222', margin: '0 0 8px' }}></div>

        <div className="comments-thread">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>Loading comments...</div>
          ) : comments.length === 0 ? (
            <div style={{ color: 'var(--gray)', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>
              Be the first to comment.
            </div>
          ) : (
            comments.map(c => (
              <div className="thread-item" key={c.id}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: colorForName(c.userName),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.85rem', color: 'white', cursor: 'pointer',
                    overflow: 'hidden'
                  }}
                  onClick={() => navigate(`/profile/${encodeURIComponent(c.userName)}`)}
                >
                  {c.userAvatar ? <img src={c.userAvatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="avatar" /> : getInitials(c.userName)}
                </div>
                <div className="thread-content">
                  <div className="thread-author-row">
                    <div
                      className="thread-author-name"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/profile/${encodeURIComponent(c.userName)}`)}
                    >
                      {c.userName}
                    </div>
                    <div className="thread-meta">
                      <span style={{ color: 'var(--gray)', fontSize: '0.8rem', marginLeft: '8px' }}>
                        {c.createdAt?.toDate ? new Date(c.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                      </span>
                    </div>
                  </div>
                  <div className="thread-text">{c.content}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="reply-bottom-bar">
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: '#1a9e6e', overflow: 'hidden',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem',
        }}>
          {user?.photoURL ? <img src={user.photoURL} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="m" /> : getInitials(user?.displayName || 'U')}
        </div>
        <form className="reply-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="reply-input"
            placeholder={user ? "Leave a reply..." : "Login to post a comment"}
            value={newComment}
            disabled={!user}
            onChange={e => setNewComment(e.target.value)}
          />
          <div className="reply-input-icons">
            <button
              type="submit"
              disabled={!newComment.trim() || !user}
              style={{
                background: 'none', border: 'none',
                color: (newComment.trim() && user) ? 'var(--orange)' : 'var(--gray)',
                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', marginRight: '8px'
              }}
            >
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
