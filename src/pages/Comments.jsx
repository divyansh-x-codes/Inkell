import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { articles as mockArticles } from '../data';

const getInitials = (name) => {
  if (!name) return 'U';
  const s = name.split(' ');
  return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name[0].toUpperCase();
};

const avatarColors = ['#cc4400','#2b9348','#7046a0','#1a6fa8','#c0392b','#16a085'];
const colorForName = (name) => avatarColors[(name||'A').charCodeAt(0) % avatarColors.length];

// Local comments stored in memory during session
const localComments = {};

export default function Comments({ showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([]);
  const [likedComments, setLikedComments] = useState({});

  const savedName = localStorage.getItem('inkwell_user_name') || 'User';

  useEffect(() => {
    const art = mockArticles.find(a => String(a.id) === String(id));
    setArticle(art);
    setComments(localComments[id] || []);
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now(),
      user_name: savedName,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      likes: 0,
    };

    const updated = [...(localComments[id] || []), comment];
    localComments[id] = updated;
    setComments(updated);
    setNewComment('');
    showToast('Comment posted!');
  };

  const toggleLike = (commentId) => {
    setLikedComments(prev => ({ ...prev, [commentId]: !prev[commentId] }));
    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, likes: (c.likes || 0) + (likedComments[commentId] ? -1 : 1) }
        : c
    ));
  };

  if (!article) return <div style={{padding:'20px',color:'white'}}>Article not found</div>;

  return (
    <div className="view active comments-page">
      <div className="comments-header">
        <button className="back-circle-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h2 className="header-title">Comments ({comments.length})</h2>
        <div style={{width:'38px'}}></div>
      </div>

      <div className="comments-scroll-area">
        <div className="original-note-context">
          <div className="note-author-row">
            <div
              className="author-letter-avatar"
              style={{width:40,height:40,background:colorForName(article.name),cursor:'pointer'}}
              onClick={() => navigate(`/profile/${encodeURIComponent(article.name)}`)}
            >
              {getInitials(article.name)}
            </div>
            <div className="note-author-info" style={{cursor:'pointer'}} onClick={() => navigate(`/profile/${encodeURIComponent(article.name)}`)}>
              <div className="note-author-name">{article.name}</div>
              <div className="note-meta">{article.date}</div>
            </div>
          </div>
          <div style={{fontSize:'1.05rem',marginTop:'12px',color:'var(--white)',lineHeight:1.4}}>
            {article.title}
          </div>
        </div>

        <div style={{height:'1px',background:'#222',margin:'0 0 8px'}}></div>

        <div className="comments-thread">
          {comments.length === 0 && (
            <div style={{color:'var(--gray)',fontSize:'0.9rem',textAlign:'center',padding:'40px 0'}}>
              Be the first to comment.
            </div>
          )}
          {comments.map(c => (
            <div className="thread-item" key={c.id}>
              <div
                style={{
                  width:40, height:40, borderRadius:'50%', flexShrink:0,
                  background: colorForName(c.user_name),
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:700, fontSize:'0.85rem', color:'white', cursor:'pointer'
                }}
                onClick={() => navigate(`/profile/${encodeURIComponent(c.user_name)}`)}
              >
                {getInitials(c.user_name)}
              </div>
              <div className="thread-content">
                <div className="thread-author-row">
                  <div
                    className="thread-author-name"
                    style={{cursor:'pointer'}}
                    onClick={() => navigate(`/profile/${encodeURIComponent(c.user_name)}`)}
                  >
                    {c.user_name}
                  </div>
                  <div className="thread-meta">
                    <span style={{color:'var(--gray)',fontSize:'0.8rem',marginLeft:'8px'}}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="thread-text">{c.content}</div>
                <div className="thread-actions">
                  <button
                    className="thread-action-btn"
                    onClick={() => toggleLike(c.id)}
                    style={{color: likedComments[c.id] ? '#e85d04' : 'var(--gray)', display:'flex', alignItems:'center', gap:4}}
                  >
                    <svg viewBox="0 0 24 24" fill={likedComments[c.id] ? '#e85d04' : 'none'} stroke={likedComments[c.id] ? '#e85d04' : 'currentColor'} strokeWidth="2">
                      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.8 1.1-1.1a5.5 5.5 0 0 0 0-7.8z"></path>
                    </svg>
                    {(c.likes || 0) > 0 && <span style={{fontSize:'0.85rem'}}>{c.likes}</span>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="reply-bottom-bar">
        <div style={{
          width:36, height:36, borderRadius:'50%', flexShrink:0,
          background:'#1a9e6e',
          display:'flex', alignItems:'center',
          justifyContent:'center', color:'white', fontWeight:700, fontSize:'0.8rem',
        }}>
          {getInitials(savedName)}
        </div>
        <form className="reply-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="reply-input"
            placeholder="Leave a reply..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
          />
          <div className="reply-input-icons">
            <button
              type="submit"
              disabled={!newComment.trim()}
              style={{
                background:'none', border:'none',
                color: newComment.trim() ? 'var(--orange)' : 'var(--gray)',
                fontSize:'0.9rem', fontWeight:600, cursor:'pointer', marginRight:'8px'
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
