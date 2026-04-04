import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import ArticleCard from '../components/ArticleCard';
import SubscribeModal from '../components/SubscribeModal';
import { useAuth } from '../context/AuthContext';
import { getConversationId, getUserProfile, getArticlesByAuthor } from '../utils/firebaseData';

const VerifiedIcon = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#f4622a" strokeWidth="2" style={{ width: size, height: size }}>
    <polygon points="12 2 15.09 5.09 19.54 4.46 20.18 8.91 23.27 12 20.18 15.09 19.54 19.54 15.09 18.91 12 22 8.91 18.91 4.46 19.54 3.82 15.09 0.73 12 3.82 8.91 4.46 4.46 8.91 5.09" fill="#1a0000" />
    <polyline points="9 12 11 14 15 10" stroke="#f4622a" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const getInitials = (name) => {
  if (!name) return 'A';
  const s = name.trim().split(' ');
  return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name[0].toUpperCase();
};

export default function Profile({ showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { username } = useParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('Posts');
  const [subscribed, setSubscribed] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);

  const authorId = location.state?.authorId;
  const decodedName = decodeURIComponent(username || '').replace('@', '');

  // 1. Profile Sync (Header Stats)
  useEffect(() => {
    const uid = authorId || (user?.uid && (user.name === decodedName || user.uid === authorId) ? user.uid : null);
    if (!uid) {
      setProfile({
        name: decodedName || 'Creator',
        handle: `@${decodedName.toLowerCase().replace(/\s/g, '')}`,
        bio: 'Sharing stories on Inkwell.',
        avatar: null, color: '#e85d04'
      });
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const unsub = subscribeToUserProfile(uid, (p) => {
      setProfile(p);
      setLoading(false);
    });
    return () => unsub();
  }, [authorId, decodedName, user]);

  // 2. Tab Sync (Individual Listeners)
  useEffect(() => {
    if (!profile?.uid && !profile?.id) return;
    const uid = profile.uid || profile.id;

    let unsubPosts, unsubActivity, unsubLikes;

    if (activeTab === 'Posts') {
      unsubPosts = subscribeToUserArticles(uid, (data) => {
        setPosts([...data].sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      });
    } else if (activeTab === 'Activity') {
      unsubActivity = subscribeToUserActivity(uid, (data) => {
        setActivity([...data].sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      });
    } else if (activeTab === 'Likes') {
      unsubLikes = subscribeToUserLikes(uid, (data) => {
        setLikedPosts([...data].sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      });
    }

    return () => {
      if (unsubPosts) unsubPosts();
      if (unsubActivity) unsubActivity();
      if (unsubLikes) unsubLikes();
    };
  }, [profile, activeTab]);

  const handleSubscribe = () => {
    if (subscribed) {
      setSubscribed(false);
      showToast('Unsubscribed');
    } else {
      setShowSubModal(true);
    }
  };

  const confirmSubscribe = () => {
    setSubscribed(true);
    setShowSubModal(false);
    showToast(`Subscribed to ${profile?.name || 'author'}`);
  };

  const handleFollow = () => {
    setFollowed(!followed);
    showToast(followed ? 'Unfollowed' : `Following ${profile?.name}`);
  };

  const openChat = () => {
    if (!user) {
      showToast('Login to message authors');
      navigate('/login');
      return;
    }
    const targetUid = profile?.uid || profile?.id || authorId;
    if (!targetUid) {
      showToast('Cannot start chat with this creator');
      return;
    }
    if (targetUid === user.uid) {
      showToast("This is your own profile!");
      return;
    }
    const convoId = getConversationId(user.uid, targetUid);
    navigate(`/chat/${convoId}`, {
      state: {
        recipientUserId: targetUid,
        recipientName: profile.name,
        recipientAvatar: profile.avatar
      }
    });
  };

  const TABS = ['Posts', 'Activity', 'Likes'];
  const isOwnProfile = user && (profile?.uid === user.uid || profile?.id === user.uid);

  return (
    <div className="profile-page app-shell">
      {showSubModal && (
        <SubscribeModal
          author={profile?.name}
          onClose={() => setShowSubModal(false)}
          onConfirm={confirmSubscribe}
        />
      )}

      <div className="profile-topbar">
        <button className="tb-circle-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div className="tb-right-actions">
          <button className="tb-circle-btn" onClick={() => navigate('/search')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>
      </div>

      <div className="profile-scroll-area">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: '#666' }}>Loading profile...</div>
        ) : profile && (
          <>
            <div className="profile-header-main">
              <div className="profile-title-row">
                <div className="profile-info">
                  <h1 className="profile-name-header">
                    {profile.name}
                    {profile.verified && (
                      <span style={{ marginLeft: 8, display: 'inline-flex', verticalAlign: 'middle' }}>
                        <VerifiedIcon size={22} />
                      </span>
                    )}
                  </h1>
                  <p className="profile-handle">{profile.handle || `@${profile.name?.toLowerCase().replace(/\s/g, '')}`}</p>
                </div>
                {profile.avatar
                  ? <img src={profile.avatar} alt={profile.name} className="profile-avatar-large" />
                  : (
                    <div style={{
                      width: 90, height: 90, borderRadius: '50%', flexShrink: 0,
                      background: profile.color || '#e85d04', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontWeight: 800, fontSize: '2rem',
                      color: 'white', marginLeft: 16, fontFamily: "'DM Sans',sans-serif",
                    }}>
                      {getInitials(profile.name)}
                    </div>
                  )
                }
              </div>

              <p className="profile-bio">{profile.bio || 'Sharing stories on Inkwell.'}</p>
              
              <div style={{ display: 'flex', gap: '20px', marginTop: '12px', marginBottom: '4px' }}>
                <div style={{ fontSize: '0.92rem', color: 'var(--white)' }}>
                  <span style={{ fontWeight: 700 }}>{profile.followersCount || 0}</span> 
                  <span style={{ color: 'var(--gray)', marginLeft: '6px' }}>Subscribers</span>
                </div>
                <div style={{ fontSize: '0.92rem', color: 'var(--white)' }}>
                  <span style={{ fontWeight: 700 }}>{profile.followingCount || 0}</span> 
                  <span style={{ color: 'var(--gray)', marginLeft: '6px' }}>Following</span>
                </div>
              </div>

              <div className="profile-action-buttons">
                {isOwnProfile ? (
                  <button className="btn-subscribe-main" onClick={() => showToast('Profile editor coming soon')}>Edit Profile</button>
                ) : (
                  <>
                    <button
                      className="btn-subscribe-main"
                      onClick={handleSubscribe}
                      style={{ background: subscribed ? '#444' : '#60c1fb' }}
                    >
                      {subscribed ? 'Subscribed ✓' : 'Subscribe'}
                    </button>
                    <button
                      className="btn-follow-main"
                      onClick={handleFollow}
                      style={{ background: followed ? '#1a3a1a' : '#262626', color: followed ? '#4caf50' : 'white' }}
                    >
                      {followed ? 'Following' : 'Follow'}
                    </button>
                    <button className="btn-share-icon" onClick={openChat} title="Message">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '20px', height: '20px' }}>
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </button>
                  </>
                )}
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
              {activeTab === 'Posts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {posts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
                      <p style={{ opacity: 0.6 }}>No stories yet.</p>
                    </div>
                  ) : (
                    posts.map(a => (
                      <ArticleCard 
                        key={a.id} 
                        article={a} 
                        showToast={showToast} 
                        isDashboard={isOwnProfile} 
                      />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'Activity' && (
                <div className="activity-feed">
                  {activity.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
                      <p style={{ opacity: 0.6 }}>No recent activity.</p>
                    </div>
                  ) : (
                    activity.map(item => (
                      <div key={item.id} className="activity-item" style={{ borderBottom: '1px solid #222', padding: '16px 0' }}>
                        <p style={{ color: 'var(--orange)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Commented</p>
                        <p style={{ color: 'white', fontSize: '0.95rem', marginBottom: 8 }}>"{item.content}"</p>
                        <p style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>On article: {item.blogId.slice(0, 8)}...</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'Likes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {likedPosts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
                      <p style={{ opacity: 0.6 }}>No liked posts yet.</p>
                    </div>
                  ) : (
                    likedPosts.map(a => (
                      <ArticleCard 
                        key={a.id} 
                        article={a} 
                        showToast={showToast} 
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav showToast={showToast} />
    </div>
  );
}
