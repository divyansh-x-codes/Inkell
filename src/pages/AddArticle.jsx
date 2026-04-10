import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createPost, updatePost, getPost } from '../utils/firebaseData';

const CATEGORIES = ['Technology', 'Design', 'Culture', 'Digital Media', 'Politics', 'Emerging Tech', 'Productivity', 'Science', 'Health', 'Business'];

export default function AddArticle({ showToast }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEdit = !!id;

  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('Technology');
  const [coverImage, setCoverImage] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const bodyRef = useRef(null);

  // Load article if in edit mode
  useEffect(() => {
    if (isEdit) {
      getPost(id).then(data => {
        if (data) {
          setTitle(data.title || '');
          setTagline(data.tagline || '');
          setBody(data.content || '');
          setCategory(data.category || 'Technology');
          setCoverImage(data.image_url || '');
        } else {
          showToast("Article not found");
          navigate('/home');
        }
        setFetching(false);
      });
    }
  }, [id, isEdit]);

  const handleAction = async () => {
    if (!title.trim() || !body.trim()) {
      showToast('Title and content are required');
      return;
    }
    if (!user) {
      showToast('Please log in to publish');
      navigate('/login');
      return;
    }

    setPublishing(true);
    const intentToast = isEdit ? 'Saving...' : 'Publishing...';
    showToast(intentToast);

    const postData = {
      title: title.trim(),
      tagline: tagline.trim(),
      content: body.trim(),
      image_url: coverImage.trim() || null,
      category,
    };

    // --- GUARANTEED VISIBILITY FIX ---
    const optimisticPost = {
      id: 'pending-' + Date.now(),
      title: title.trim(),
      tagline: tagline.trim(),
      content: body.trim(),
      image_url: coverImage.trim() || null,
      category: category,
      created_at: new Date().toISOString(),
      user_id: user.uid,
      profiles: user.profiles || { name: user.email || 'Author' },
      likes_count: 0,
      comments_count: 0,
      is_pending: true
    };

    // 1. Save to local storage so it survives navigation/refresh
    try {
      const pending = JSON.parse(localStorage.getItem('inktrix_pending_posts') || '[]');
      localStorage.setItem('inktrix_pending_posts', JSON.stringify([optimisticPost, ...pending]));
    } catch (e) { console.error("LS Error:", e); }

    // 2. Dispatch for immediate UI update
    window.dispatchEvent(new CustomEvent('local_post_created', { detail: optimisticPost }));

    showToast(isEdit ? '✅ Saving...' : '🎉 Published!');
    
    // 3. Background Sync
    (async () => {
      try {
        const result = await (isEdit ? updatePost(id, postData) : createPost(postData, user.uid));
        if (!result.error) {
          // Remove from pending on success
          const currentPending = JSON.parse(localStorage.getItem('inktrix_pending_posts') || '[]');
          localStorage.setItem('inktrix_pending_posts', JSON.stringify(currentPending.filter(p => p.title !== optimisticPost.title)));
        }
      } catch (e) {
        console.error("BG Sync fail:", e);
      }
    })();

    setTimeout(() => {
      navigate(isEdit ? `/article/${id}` : '/home', { replace: true });
    }, 200);
  };

  // Handle real-time WYSIWYG input
  const handleInput = (e) => {
    setBody(e.target.innerHTML);
  };

  const applyFormat = (type, value = null) => {
    const editor = bodyRef.current;
    if (!editor) return;
    editor.focus();
    switch (type) {
      case 'bold': document.execCommand('bold', false, null); break;
      case 'point': document.execCommand('insertUnorderedList', false, null); break;
      case 'color': document.execCommand('foreColor', false, value); break;
      case 'align':
        if (value === 'center') document.execCommand('justifyCenter', false, null);
        else document.execCommand('justifyLeft', false, null);
        break;
      default: return;
    }
    setBody(editor.innerHTML);
  };

  // Initial content setup for edit mode
  useEffect(() => {
    if (!fetching && isEdit && bodyRef.current && body) {
      if (!bodyRef.current.innerHTML) {
        bodyRef.current.innerHTML = body;
      }
    }
  }, [fetching, isEdit, body]);

  if (fetching) {
    return (
      <div style={{ background: '#0d0d0d', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
        Loading post data...
      </div>
    );
  }

  return (
    <div className="view active" style={{ background: '#0d0d0d', minHeight: '100%', position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid #1a1a1a',
        position: 'sticky', top: 0, background: '#0d0d0d', zIndex: 10,
      }}>
        <button
          type="button"
          onClick={() => isEdit ? navigate(`/article/${id}`, { replace: true }) : navigate('/home', { replace: true })}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Back
        </button>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', color: 'white', fontWeight: 700 }}>
          {isEdit ? 'Edit Post' : 'New Post'}
        </div>
        <button
          type="button"
          onClick={handleAction}
          disabled={publishing || !title.trim() || !body.trim()}
          style={{
            background: publishing ? '#555' : '#e85d04',
            color: 'white', border: 'none', borderRadius: 20,
            padding: '8px 18px', fontSize: '0.85rem', fontWeight: 700,
            cursor: publishing ? 'default' : 'pointer',
            opacity: (!title.trim() || !body.trim()) ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
        >
          {publishing ? 'Publishing...' : (isEdit ? 'Save Changes' : 'Publish')}
        </button>
      </div>

      <div className="article-form-scroll" style={{ padding: '20px 16px', overflowY: 'auto', height: 'calc(100vh - 120px)', paddingBottom: 100 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ overflowX: 'auto', display: 'flex', gap: 8, paddingBottom: 4, scrollbarWidth: 'none' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                style={{
                  flexShrink: 0, padding: '5px 14px', borderRadius: 20,
                  border: category === cat ? 'none' : '1px solid #333',
                  background: category === cat ? '#e85d04' : 'transparent',
                  color: category === cat ? 'white' : '#888',
                  fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <textarea
          placeholder="New Post Title..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          rows={2}
          style={{
            width: '100%', background: 'none', border: 'none', outline: 'none',
            color: 'white', fontSize: '1.6rem', fontWeight: 700,
            fontFamily: "'Playfair Display', serif", resize: 'none',
            lineHeight: 1.3, marginBottom: 12,
          }}
        />

        <textarea
          placeholder="A short subtitle..."
          value={tagline}
          onChange={e => setTagline(e.target.value)}
          rows={2}
          style={{
            width: '100%', background: 'none', border: 'none', outline: 'none',
            color: '#aaa', fontSize: '1rem',
            fontFamily: "'DM Sans', sans-serif", resize: 'none',
            lineHeight: 1.5, marginBottom: 16,
          }}
        />

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Image URL (optional)
          </div>
          <input
            type="url"
            placeholder="https://..."
            value={coverImage}
            onChange={e => setCoverImage(e.target.value)}
            style={{
              width: '100%', background: '#111', border: '1px solid #222',
              borderRadius: 8, padding: '10px 14px', color: 'white',
              fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {coverImage && (
            <img
              src={coverImage}
              alt="preview"
              onError={e => e.target.style.display = 'none'}
              style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginTop: 8 }}
            />
          )}
        </div>

        <div style={{ height: 1, background: '#1a1a1a', margin: '16px 0' }}></div>

        <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Post Content
        </div>
        <div
          ref={bodyRef}
          contentEditable
          data-placeholder="Start writing..."
          onInput={handleInput}
          className="rich-editor"
        />

        <div style={{ marginTop: 16, padding: '12px 16px', background: '#111', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#cc4400', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: '0.85rem', flexShrink: 0 }}>
            {user?.profiles?.name ? user.profiles.name[0] : (user?.email ? user.email[0].toUpperCase() : 'A')}
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>
              {user?.profiles?.name || user?.email || 'Author'}
            </div>
          </div>
        </div>
      </div>

      <div className="formatting-toolkit">
        <div className="tk-group">
          <button type="button" className="tk-btn" onClick={() => applyFormat('bold')} title="Bold"><strong>B</strong></button>
          <button type="button" className="tk-btn" onClick={() => applyFormat('point')} title="Bullet List">●</button>
        </div>
        <div className="tk-divider"></div>
        <div className="tk-group">
          <select className="tk-select" onChange={(e) => applyFormat('color', e.target.value)} value="">
            <option value="" disabled>Color</option>
            <option value="#ff4d4f" style={{ color: '#ff4d4f' }}>Red</option>
            <option value="#1a9e6e" style={{ color: '#1a9e6e' }}>Green</option>
            <option value="#ffffff" style={{ color: '#ffffff' }}>White</option>
          </select>
        </div>
        <div className="tk-divider"></div>
        <div className="tk-group">
          <button type="button" className="tk-btn" onClick={() => applyFormat('align', 'left')} title="Align Left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

