import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToComments, addComment, deleteComment, getPost } from '../utils/firebaseData';

const getInitials = (name) => {
  if (!name) return 'U';
  const s = name.trim().split(' ');
  return s.length > 1 ? (s[0][0] + (s[1][0] || '')).toUpperCase() : name[0].toUpperCase();
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

  useEffect(() => {
    if (!id) return;
    getPost(id).then(data => {
      if (data) setArticle(data);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const unsubscribe = subscribeToComments(id, (data) => {
      setComments(data || []);
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

    const content = newComment.trim();
    setNewComment('');

    const result = await addComment(id, user.uid, content);
    if (result.error) {
      showToast('Failed to post comment');
      setNewComment(content); 
    } else {
      showToast('Comment posted!');
    }
  };

  const handleDelete = async (commentId) => {
    const result = await deleteComment(commentId);
    if (result.error) {
      showToast('Failed to delete');
    } else {
      showToast('Comment deleted');
    }
  };

  if (!article && !loading) return <div style={{ padding: '20px', color: 'white' }}>Post not found</div>;

  const authorName = article?.profiles?.name || article?.profiles?.username || 'Author';

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
                onClick={() => navigate(`/profile/${encodeURIComponent(authorName)}`, { state: { authorId: article.user_id } })}
              >
                {article.profiles?.avatar_url ? <img src={article.profiles.avatar_url} style={{width:'100%',height:'100%',borderRadius:'50%'}} alt="av" /> : getInitials(authorName)}
              </div>
              <div className="note-author-info" style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${encodeURIComponent(authorName)}`, { state: { authorId: article.user_id } })}>
                <div className="note-author-name">{authorName}</div>
                <div className="note-meta">{article.category || 'Post'}</div>
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
                    background: colorForName(c.profiles?.name || c.profiles?.username),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.85rem', color: 'white', cursor: 'pointer',
                    overflow: 'hidden'
                  }}
                  onClick={() => navigate(`/profile/${encodeURIComponent(c.profiles?.name || c.profiles?.username)}`, { state: { authorId: c.user_id } })}
                >
                  {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="avatar" /> : getInitials(c.profiles?.name || c.profiles?.username)}
                </div>
                <div className="thread-content">
                  <div className="thread-author-row">
                    <div
                      className="thread-author-name"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/profile/${encodeURIComponent(c.profiles?.name || c.profiles?.username)}`, { state: { authorId: c.user_id } })}
                    >
                      {c.profiles?.name || c.profiles?.username}
                    </div>
                    <div className="thread-meta">
                      <span style={{ color: 'var(--gray)', fontSize: '0.8rem', marginLeft: '12px' }}>
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Just now'}
                      </span>
                    </div>
                    {user && c.user_id === user.uid && (
                      <button className="del-btn" onClick={() => handleDelete(c.id)} style={{marginLeft: 'auto', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px'}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{width: 17, height: 17}}>
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
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
          background: '#cc4400', overflow: 'hidden',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem',
        }}>
          {user?.profiles?.avatar_url ? <img src={user.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="m" /> : getInitials(user?.profiles?.name || user?.email || 'U')}
        </div>
        <form className="reply-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="reply-input"
            placeholder={user ? "Leave a reply..." : "Login to comment"}
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


