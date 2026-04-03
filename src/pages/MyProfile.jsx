import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import ArticleCard from '../components/ArticleCard';
import { articles } from '../data';
import { loadMyProfile } from './EditProfile';

const DEFAULT_PROFILE = {
  name: 'You',
  handle: '@inkwell_reader',
  bio: 'Reading enthusiast. Tech, AI, and culture. Subscriber to great ideas.',
  color: '#1a9e6e',
  avatar: null,
};

const TABS = ['Activity', 'Posts', 'Likes', 'Reads'];

export default function MyProfile({ showToast }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Activity');

  // Always read fresh from localStorage on each render
  const profile = loadMyProfile() || DEFAULT_PROFILE;
  const { name, handle, bio, avatar, color } = profile;

  const getInitials = (n) => {
    if (!n) return 'Y';
    const s = n.trim().split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : n[0].toUpperCase();
  };

  const getLikedArticles = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('inkwell_likes') || '{}');
      return articles.filter(a => saved[a.id]);
    } catch { return []; }
  };

  const getReadArticles = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('inkwell_reads') || '{}');
      return articles.filter(a => saved[a.id]);
    } catch { return []; }
  };

  const getMyComments = () => {
    try {
      const all = JSON.parse(localStorage.getItem('inkwell_comments') || '{}');
      const mine = [];
      Object.entries(all).forEach(([articleId, comments]) => {
        const art = articles.find(a => a.id === parseInt(articleId));
        if (!art) return;
        comments.filter(c => c.user === 'You').forEach(c => {
          mine.push({ ...c, article: art });
        });
      });
      return mine.reverse();
    } catch { return []; }
  };

  const likedArticles = getLikedArticles();
  const readArticles = getReadArticles();
  const myComments = getMyComments();

  return (
    <div className="profile-page app-shell">

      {/* Top bar */}
      <div className="profile-topbar">
        <button className="tb-circle-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div style={{ fontWeight: 700, color: 'var(--white)', fontSize: '1.05rem', fontFamily: "'DM Sans',sans-serif" }}>
          My Profile
        </div>
        <button className="tb-circle-btn" onClick={() => navigate('/edit-profile')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
      </div>

      <div className="profile-scroll-area">
        <div className="profile-header-main">

          {/* Avatar + Name row */}
          <div className="profile-title-row">
            <div className="profile-info">
              <h1 className="profile-name-header">{name}</h1>
              <p className="profile-handle">{handle}</p>
            </div>
            {avatar
              ? (
                <img
                  src={avatar}
                  alt={name}
                  className="profile-avatar-large"
                  onClick={() => navigate('/edit-profile')}
                  style={{ cursor: 'pointer' }}
                />
              )
              : (
                <div
                  style={{
                    width: 90, height: 90, borderRadius: '50%', flexShrink: 0,
                    background: color, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 800, fontSize: '2rem',
                    color: 'white', marginLeft: 16, fontFamily: "'DM Sans',sans-serif",
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/edit-profile')}
                >
                  {getInitials(name)}
                </div>
              )
            }
          </div>

          <p className="profile-bio">{bio}</p>
          <p className="profile-subs-count">3 subscribers</p>

          <div className="profile-action-buttons">
            <button
              className="btn-follow-main"
              style={{ flex: 1 }}
              onClick={() => navigate('/edit-profile')}
            >
              Edit Profile
            </button>
            <button className="btn-share-icon" onClick={() => showToast('Profile link copied!')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '20px', height: '20px' }}>
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          {TABS.map(tab => (
            <div
              key={tab}
              className={`ptab-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="profile-feed">

          {activeTab === 'Activity' && (
            myComments.length === 0
              ? <div style={{ textAlign: 'center', color: '#666', padding: '40px 20px', fontSize: '0.95rem' }}>
                  No activity yet. Start reading and commenting!
                </div>
              : myComments.map((c, i) => (
                <div
                  key={i}
                  className="profile-post"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/comments/${c.article?.id}`)}
                >
                  <div style={{ fontSize: '0.75rem', color: '#e85d04', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {c.article?.name}
                  </div>
                  <div style={{ color: 'var(--white)', fontWeight: 600, marginBottom: 6, fontSize: '0.95rem', lineHeight: 1.3 }}>
                    {c.article?.title}
                  </div>
                  <div style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: 8 }}>
                    💬 "{c.text}"
                  </div>
                  <div style={{ color: '#555', fontSize: '0.8rem' }}>{c.time}</div>
                </div>
              ))
          )}

          {activeTab === 'Likes' && (
            likedArticles.length === 0
              ? <div style={{ textAlign: 'center', color: '#666', padding: '40px 20px', fontSize: '0.95rem' }}>
                  No liked articles yet. Heart any article to save it here.
                </div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {likedArticles.map(a => <ArticleCard key={a.id} article={a} showToast={showToast} />)}
                </div>
          )}

          {activeTab === 'Reads' && (
            readArticles.length === 0
              ? <div style={{ textAlign: 'center', color: '#666', padding: '40px 20px', fontSize: '0.95rem' }}>
                  No articles read yet. Tap any article to start.
                </div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {readArticles.map(a => <ArticleCard key={a.id} article={a} showToast={showToast} />)}
                </div>
          )}

          {activeTab === 'Posts' && (
            <div style={{ textAlign: 'center', color: '#666', padding: '40px 20px', fontSize: '0.95rem' }}>
              You haven't published any posts yet.
            </div>
          )}

        </div>
      </div>

      <BottomNav showToast={showToast} />
    </div>
  );
}
