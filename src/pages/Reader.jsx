import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import {
  toggleLike,
  subscribeToLikes,
} from '../utils/supabaseData';

export default function Reader({ showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  const handleDeleteBlog = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) showToast("Failed to delete");
      else {
        showToast("Post deleted");
        navigate('/home');
      }
    }
  };

  useEffect(() => {
    if (!id) return;
    
    const fetchArticle = async () => {
      const loadTimer = setTimeout(() => setLoading(true), 250);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*, profiles!user_id(*)')
          .eq('id', id)
          .single();
        
        clearTimeout(loadTimer);
        if (error) throw error;
        if (data) {
          setArticle(data);
          setLikesCount(data.likes_count);
        }
      } catch (err) {
        console.error("Story fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();

    // Subscribe to likes
    const unsubLikes = subscribeToLikes(id, setLiked, setLikesCount);

    // Subscribe to post updates (e.g. comment count)
    const channel = supabase
      .channel(`post_reader_${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts', filter: `id=eq.${id}` }, (payload) => {
        setArticle(prev => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => {
      unsubLikes();
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleLike = async () => {
    if (!user) { showToast('Login to like'); navigate('/login'); return; }
    await toggleLike(id, user.id);
  };

  const handleSave = async () => {
    showToast('Save coming soon!');
  };

  if (loading && !article) {
    return (
      <div style={{ background: 'var(--paper-bg)', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', color: 'var(--text-ink-muted)', fontFamily: "'DM Sans', sans-serif" }}>
        <div>Loading story...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div style={{ background: 'var(--paper-bg)', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '40px', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-ink)', fontSize: '1.2rem', fontWeight: 600 }}>Story not found</div>
        <div style={{ color: '#666' }}>We couldn't retrieve this story. It might still be uploading or was deleted.</div>
        <button className="btn-primary" onClick={() => window.location.reload()} style={{ width: 'auto', padding: '12px 32px' }}>Try Refreshing</button>
        <button onClick={() => navigate('/home')} style={{ color: 'var(--ink-accent)', fontWeight: 600, background: 'none', border: 'none' }}>Go back Home</button>
      </div>
    );
  }

  const authorName = article.profiles?.name || article.profiles?.username || 'Anonymous';
  const authorAvatar = article.profiles?.avatar_url;

  const getInitials = (name) => {
    if (!name) return 'A';
    const split = name.split(' ');
    return split.length > 1 ? (split[0][0] + split[1][0]).toUpperCase() : name[0].toUpperCase();
  };

  return (
    <div className="view active reader-page reader-paper-mode">
      <div className="app-shell" style={{ background: 'var(--paper-bg)', position: 'relative' }}>
        <div className="reader-topbar">
          <button className="tb-circle-btn" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/home')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <div className="tb-right-actions" style={{ gap: 8 }}>
            {user && article && user.id === article.user_id && (
              <button className="tb-circle-btn edit-btn" onClick={() => navigate(`/edit-article/${article.id}`)} style={{ color: 'var(--orange)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 18, height: 18 }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path>
                </svg>
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <button className="tb-circle-btn" onClick={() => setShowMenu(!showMenu)}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="1.5"></circle>
                  <circle cx="12" cy="12" r="1.5"></circle>
                  <circle cx="19" cy="12" r="1.5"></circle>
                </svg>
              </button>
              {showMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: 48, background: '#fff',
                  border: '1px solid rgba(0,0,0,0.12)', borderRadius: 12, padding: '4px 0',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 160, zIndex: 100
                }}>
                  <div onClick={() => { navigator.clipboard.writeText(window.location.href); showToast('Link copied!'); setShowMenu(false); }} style={{ padding: '12px 20px', color: 'var(--text-ink)', fontWeight: 500, cursor: 'pointer' }}>
                    Copy Link
                  </div>
                  {user && article && user.id === article.user_id && (
                    <div onClick={() => { setShowMenu(false); handleDeleteBlog(); }} style={{ padding: '12px 20px', color: '#c0392b', fontWeight: 600, cursor: 'pointer', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                      Delete
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="reader-scroll-area">
          <div className="reader-pub">{article.category || 'Post'}</div>
          <h1 className="reader-title">{article.title}</h1>
          <p className="reader-tagline">{article.tagline}</p>

          <div className="reader-author-row" onClick={() => navigate(`/profile/${encodeURIComponent(authorName)}`, { state: { authorId: article.user_id } })} style={{ cursor: 'pointer' }}>
            <div className="reader-author-details">
              <div className="reader-author-name">{authorName.toUpperCase()}</div>
              <div className="reader-author-date">
                {article.created_at ? new Date(article.created_at).toLocaleDateString() : 'Just now'}
              </div>
            </div>
            <div className="reader-avatar" style={{ background: '#cc4400' }}>
               {authorAvatar ? <img src={authorAvatar} alt="av" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : getInitials(authorName)}
            </div>
          </div>

          <div className="reader-divider"></div>

          <div className="reader-body">
            {article.image_url && <img src={article.image_url} className="reader-hero-img" alt="cover" />}
            <div className="Inktrix-article">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {article.content || ''}
              </ReactMarkdown>
            </div>
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
              <span>{article.comments_count || 0}</span>
            </button>
            <button className={`floating-action-btn ${saved ? 'saved' : ''}`} onClick={handleSave}>
              <svg viewBox="0 0 24 24" fill={saved ? 'var(--save-blue)' : 'none'} stroke={saved ? 'var(--save-blue)' : 'currentColor'} strokeWidth="1.75">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>
        </div>

        <BottomNav showToast={showToast} currentPath={null} />
      </div>
    </div>
  );
}

