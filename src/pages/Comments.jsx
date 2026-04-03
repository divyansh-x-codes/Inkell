import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { articles as mockArticles } from '../data';
import { useAuth } from '../context/AuthContext';
import { fetchComments, postComment } from '../utils/supabaseData';
import { supabase } from '../supabaseClient';

const getInitials = (name) => {
  if (!name) return 'U';
  const s = name.split(' ');
  return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name[0].toUpperCase();
};

const avatarColors = ['#cc4400','#2b9348','#7046a0','#1a6fa8','#c0392b','#16a085'];
const colorForName = (name) => avatarColors[(name||'A').charCodeAt(0) % avatarColors.length];

export default function Comments({ showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([]);
  const [likedComments, setLikedComments] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // Fetch article info (fallback to mock if not found in DB yet)
      const { data: artData } = await supabase.from('articles').select('*').eq('id', id).single();
      setArticle(artData || mockArticles.find(a => a.id === parseInt(id)));

      // Fetch comments from Supabase
      const comms = await fetchComments(id);
      setComments(comms);
      setLoading(false);
    }
    init();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) {
      if (!user) showToast('Please log in to comment');
      return;
    }

    const userName = user.user_metadata?.full_name || user.email;
    const content = newComment.trim();

    const { data, error } = await postComment(id, user.id, userName, content);

    if (error) {
      showToast(error.message);
    } else {
      setComments(prev => [...prev, ...data]);
      setNewComment('');
      showToast('Comment posted!');
    }
  };

  const toggleLike = (commentId) => {
    setLikedComments(prev => ({ ...prev, [commentId]: !prev[commentId] }));
    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, likes: (c.likes || 0) + (likedComments[commentId] ? -1 : 1) }
        : c
    ));
  };

  if (loading) return <div style={{padding:'20px',color:'white'}}>Loading comments...</div>;
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
              style={{width:40,height:40,background:colorForName(article.author_name || article.name),cursor:'pointer'}}
              onClick={() => navigate(`/profile/${encodeURIComponent(article.author_name || article.name)}`)}
            >
              {getInitials(article.author_name || article.name)}
            </div>
            <div className="note-author-info" style={{cursor:'pointer'}} onClick={() => navigate(`/profile/${encodeURIComponent(article.author_name || article.name)}`)}>
              <div className="note-author-name">{article.author_name || article.name}</div>
              <div className="note-meta">{article.pub_date || article.date}</div>
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
                  background: colorForName(c.user_name || c.user),
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:700, fontSize:'0.85rem', color:'white', cursor:'pointer'
                }}
                onClick={() => navigate(`/profile/${encodeURIComponent(c.user_name || c.user)}`)}
              >
                {getInitials(c.user_name || c.user)}
              </div>
              <div className="thread-content">
                <div className="thread-author-row">
                  <div
                    className="thread-author-name"
                    style={{cursor:'pointer'}}
                    onClick={() => navigate(`/profile/${encodeURIComponent(c.user_name || c.user)}`)}
                  >
                    {c.user_name || c.user}
                  </div>
                  <div className="thread-meta">
                    <span style={{color:'var(--gray)',fontSize:'0.8rem',marginLeft:'8px'}}>
                      {new Date(c.created_at).toLocaleDateString() || c.time}
                    </span>
                  </div>
                </div>
                <div className="thread-text">{c.content || c.text}</div>
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
          background: user?.user_metadata?.avatar_url ? 'transparent' : '#1a9e6e',
          display:'flex', alignItems:'center',
          justifyContent:'center', color:'white', fontWeight:700, fontSize:'0.8rem',
          overflow: 'hidden'
        }}>
          {user?.user_metadata?.avatar_url 
            ? <img src={user.user_metadata.avatar_url} style={{width:'100%', height:'100%', objectFit:'cover'}} />
            : getInitials(user?.user_metadata?.full_name || user?.email || 'Y')
          }
        </div>
        <form className="reply-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="reply-input"
            placeholder={user ? "Leave a reply..." : "Log in to reply..."}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            disabled={!user}
          />
          <div className="reply-input-icons">
            <button
              type="submit"
              disabled={!newComment.trim() || !user}
              style={{
                background:'none', border:'none',
                color: newComment.trim() && user ? 'var(--orange)' : 'var(--gray)',
                fontSize:'0.9rem', fontWeight:600, cursor: user ? 'pointer' : 'default', marginRight:'8px'
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
