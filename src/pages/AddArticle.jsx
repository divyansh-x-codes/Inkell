import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createBlog, updateBlog, getBlog } from '../utils/firebaseData';

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
  const [readTime, setReadTime] = useState('5 min read');
  const [publishing, setPublishing] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  // Load article if in edit mode
  useEffect(() => {
    if (isEdit) {
      getBlog(id).then(data => {
        if (data) {
          setTitle(data.title || '');
          setTagline(data.tagline || '');
          setBody(data.content || '');
          setCategory(data.category || 'Technology');
          setCoverImage(data.coverImage || '');
          setReadTime(data.readTime || '5 min read');
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
    showToast(isEdit ? 'Saving changes...' : 'Publishing...');

    const blogData = {
      title: title.trim(),
      tagline: tagline.trim(),
      content: body.trim(),
      category,
      coverImage: coverImage.trim() || (isEdit ? '' : `https://picsum.photos/seed/${Date.now()}/800/400`),
      readTime,
    };

    let result;
    if (isEdit) {
      result = await updateBlog(id, blogData);
    } else {
      result = await createBlog(blogData, user);
    }

    setPublishing(false);

    if (result.error) {
      showToast('Failed: ' + result.error.message);
    } else {
      showToast(isEdit ? '✅ Changes saved!' : '🎉 Article published!');
      navigate(isEdit ? `/article/${id}` : '/home');
    }
  };

  if (fetching) {
    return (
      <div style={{ background: '#0d0d0d', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
        Loading article data...
      </div>
    );
  }

  return (
    <div className="view active" style={{ background: '#0d0d0d', minHeight: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid #1a1a1a',
        position: 'sticky', top: 0, background: '#0d0d0d', zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Back
        </button>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', color: 'white', fontWeight: 700 }}>
          {isEdit ? 'Edit Article' : 'New Article'}
        </div>
        <button
          onClick={handleAction}
          disabled={publishing || !title.trim() || !body.trim()}
          style={{
            background: publishing ? '#333' : '#e85d04',
            color: 'white', border: 'none', borderRadius: 20,
            padding: '8px 18px', fontSize: '0.85rem', fontWeight: 700,
            cursor: publishing ? 'default' : 'pointer',
            opacity: (!title.trim() || !body.trim()) ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
        >
          {publishing ? (isEdit ? 'Saving...' : 'Publishing...') : (isEdit ? 'Save Changes' : 'Publish')}
        </button>
      </div>

      {/* Form */}
      <div style={{ padding: '20px 16px', overflowY: 'auto', paddingBottom: 60 }}>

        {/* Category selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ overflowX: 'auto', display: 'flex', gap: 8, paddingBottom: 4, scrollbarWidth: 'none' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
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

        {/* Title */}
        <textarea
          placeholder="Your article title..."
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

        {/* Tagline */}
        <textarea
          placeholder="A short tagline or subtitle..."
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

        {/* Cover Image URL */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Cover Image URL (optional)
          </div>
          <input
            type="url"
            placeholder="https://images.unsplash.com/..."
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

        {/* Read time */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Read time
          </div>
          <select
            value={readTime}
            onChange={e => setReadTime(e.target.value)}
            style={{
              background: '#111', border: '1px solid #222', borderRadius: 8,
              padding: '10px 14px', color: 'white', fontSize: '0.85rem', outline: 'none',
            }}
          >
            {['2 min read', '3 min read', '5 min read', '7 min read', '10 min read', '15 min read'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={{ height: 1, background: '#1a1a1a', margin: '16px 0' }}></div>

        {/* Body */}
        <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Article Body
        </div>
        <textarea
          placeholder="Write your article here... (supports plain text)"
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={18}
          style={{
            width: '100%', background: 'none', border: '1px solid #1a1a1a',
            borderRadius: 8, outline: 'none', color: '#ccc',
            fontSize: '0.97rem', fontFamily: "'DM Sans', sans-serif",
            resize: 'vertical', lineHeight: 1.8, padding: '14px',
            boxSizing: 'border-box',
          }}
        />

        {/* Author info */}
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#111', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a9e6e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: '0.85rem', flexShrink: 0 }}>
            {(user?.name || user?.displayName || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>
              {user?.name || user?.displayName || 'Anonymous'}
            </div>
            <div style={{ color: '#555', fontSize: '0.78rem' }}>Publishing as this author</div>
          </div>
        </div>
      </div>
    </div>
  );
}
