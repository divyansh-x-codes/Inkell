import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import ArticleCard from '../components/ArticleCard';
import { useAuth } from '../context/AuthContext';
import { 
  getPostsByAuthor, 
  getLikedPosts, 
  getUserActivity, 
  getFollowStats 
} from '../utils/supabaseData';

const TABS = ['Activity', 'Posts', 'Likes'];

export default function MyProfile({ showToast }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Posts');
  
  const [posts, setPosts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    if (!user?.id) return;
    const loadStats = async () => {
      const s = await getFollowStats(user.id);
      setStats(s);
      setLoading(false);
    };
    loadStats();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const loadTabData = async () => {
      if (activeTab === 'Posts') {
        const data = await getPostsByAuthor(user.id);
        setPosts(data);
      } else if (activeTab === 'Activity') {
        const data = await getUserActivity(user.id);
        setActivity(data);
      } else if (activeTab === 'Likes') {
        const data = await getLikedPosts(user.id);
        setLikedPosts(data);
      }
    };
    loadTabData();
  }, [user?.id, activeTab]);

  const getInitials = (n) => {
    if (!n) return 'Y';
    const s = n.trim().split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : n[0].toUpperCase();
  };

  if (!user) {
    return (
      <div className="profile-page app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
        <button className="btn-primary" onClick={() => navigate('/login')}>Login to view profile</button>
      </div>
    );
  }

  const profile = user.profiles || {};

  return (
    <div className="profile-page app-shell">
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
          <div className="profile-title-row">
            <div className="profile-info">
              <h1 className="profile-name-header">{profile.name || profile.username || 'User'}</h1>
              <p className="profile-handle">@{profile.username || 'handle'}</p>
            </div>
            <div 
              className="profile-avatar-large" 
              style={{ background: '#cc4400', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:'2rem', borderRadius:'50%', overflow:'hidden', cursor:'pointer' }}
              onClick={() => navigate('/edit-profile')}
            >
                {profile.avatar_url ? <img src={profile.avatar_url} alt="av" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : getInitials(profile.name || profile.username)}
            </div>
          </div>

          <p className="profile-bio">{profile.bio || 'Sharing stories on Inktrix.'}</p>
          
          <div style={{ display: 'flex', gap: '20px', marginTop: '12px', marginBottom: '4px' }}>
            <div style={{ fontSize: '0.92rem', color: 'var(--white)' }}>
              <span style={{ fontWeight: 700 }}>{stats.followers}</span> 
              <span style={{ color: 'var(--gray)', marginLeft: '6px' }}>Subscribers</span>
            </div>
            <div style={{ fontSize: '0.92rem', color: 'var(--white)' }}>
              <span style={{ fontWeight: 700 }}>{stats.following}</span> 
              <span style={{ color: 'var(--gray)', marginLeft: '6px' }}>Following</span>
            </div>
          </div>

          <div className="profile-action-buttons">
            <button
              className="btn-follow-main"
              style={{ flex: 1 }}
              onClick={() => navigate('/edit-profile')}
            >
              Edit Profile
            </button>
          </div>
        </div>

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

        <div className="profile-feed">
          {activeTab === 'Activity' && (
            activity.length === 0
              ? <div style={{ textAlign: 'center', color: '#666', padding: '40px 20px', fontSize: '0.95rem' }}>
                  No activity yet. Start reading and commenting!
                </div>
              : activity.map((c, i) => (
                <div
                  key={i}
                  className="profile-post"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/comments/${c.post_id}`)}
                >
                  <div style={{ fontSize: '0.75rem', color: '#e85d04', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Activity
                  </div>
                  <div style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: 8 }}>
                    💬 "{c.content}"
                  </div>
                  <div style={{ color: '#555', fontSize: '0.8rem' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Just now'}</div>
                </div>
              ))
          )}

          {activeTab === 'Likes' && (
            likedPosts.length === 0
              ? <div style={{ textAlign: 'center', color: '#666', padding: '40px 20px', fontSize: '0.95rem' }}>
                  No liked articles yet. Heart any article to save it here.
                </div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {likedPosts.map(a => <ArticleCard key={a.id} article={a} showToast={showToast} />)}
                </div>
          )}

          {activeTab === 'Posts' && (
            posts.length === 0
              ? <div style={{ textAlign: 'center', color: '#666', padding: '40px 20px', fontSize: '0.95rem' }}>
                  You haven't published any posts yet.
                </div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {posts.map(a => <ArticleCard key={a.id} article={a} showToast={showToast} isDashboard />)}
                </div>
          )}
        </div>
      </div>

      <BottomNav showToast={showToast} />
    </div>
  );
}

