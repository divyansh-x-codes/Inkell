import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PremiumLoader from '../components/PremiumLoader';
import BottomNav from '../components/BottomNav';
import ArticleCard from '../components/ArticleCard';
import SubscribeModal from '../components/SubscribeModal';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import {
  getUserProfile,
  getPostsByAuthor,
  getLikedPosts,
  getUserActivity,
  getFollowStats,
  followUser,
  unfollowUser,
  isFollowing
} from '../utils/firebaseData';

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
  const [stats, setStats] = useState({ followers: 0, following: 0 });

  const authorId = location.state?.authorId;
  const decodedName = decodeURIComponent(username || '').replace('@', '');

  useEffect(() => {
    const fetchProfile = async () => {
      let uid = authorId;
      if (!uid && decodedName) {
        // Try looking up by username in Firestore
        const q = query(collection(db, 'profiles'), where('username', '==', decodedName.toLowerCase()));
        const snap = await getDocs(q);
        uid = snap.docs[0]?.id;
      }

      if (!uid) {
        setProfile({ name: decodedName, username: decodedName, bio: 'Creator on Inktrix' });
        setLoading(false);
        return;
      }

      setLoading(true);
      const p = await getUserProfile(uid);
      setProfile(p ? { ...p, id: uid } : { name: decodedName, id: uid });
      
      const s = await getFollowStats(uid);
      setStats(s);

      if (user?.uid) {
        const f = await isFollowing(user.uid, uid);
        setFollowed(f);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [authorId, decodedName, user?.uid]);

  useEffect(() => {
    if (!profile?.id) return;
    const loadTabData = async () => {
      if (activeTab === 'Posts') {
        const data = await getPostsByAuthor(profile.id);
        setPosts(data);
      } else if (activeTab === 'Activity') {
        const data = await getUserActivity(profile.id);
        setActivity(data);
      } else if (activeTab === 'Likes') {
        const data = await getLikedPosts(profile.id);
        setLikedPosts(data);
      }
    };
    loadTabData();
  }, [profile?.id, activeTab]);

  const handleSubscribe = () => {
    if (!user) { showToast('Login to subscribe'); navigate('/login'); return; }
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
    showToast(`Subscribed to ${profile?.name || profile?.username}`);
  };

  const handleFollow = async () => {
    if (!user) { showToast('Login to follow'); navigate('/login'); return; }
    if (followed) {
      setFollowed(false);
      await unfollowUser(user.uid, profile.id);
      setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
      showToast('Unfollowed');
    } else {
      setFollowed(true);
      await followUser(user.uid, profile.id);
      setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      showToast(`Following ${profile?.name || profile?.username}`);
    }
  };

  const openChat = () => {
    showToast('Messaging transitioned to Firebase Chat!');
    navigate('/conversations');
  };

  const TABS = ['Posts', 'Activity', 'Likes'];
  const isOwnProfile = user && profile?.id === user.uid;

  if (loading) {
    return (
      <div className="app-shell" style={{ display:'flex', flexDirection: 'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#000' }}>
        <PremiumLoader size={48} color="var(--orange)" thickness={3} />
        <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page app-shell">
      {showSubModal && (
        <SubscribeModal author={profile?.name || profile?.username} onClose={() => setShowSubModal(false)} onConfirm={confirmSubscribe} />
      )}

      <div className="profile-topbar">
        <button className="tb-circle-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>

      <div className="profile-scroll-area">
        {profile && (
          <>
            <div className="profile-header-main">
              <div className="profile-title-row">
                <div className="profile-info">
                  <h1 className="profile-name-header">
                    {profile.name || profile.username}
                    {profile.verified && <span style={{ marginLeft: 8 }}><VerifiedIcon size={22} /></span>}
                  </h1>
                  <p className="profile-handle">@{profile.username || 'user'}</p>
                </div>
                <div className="profile-avatar-large" style={{ background: '#cc4400', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:'2rem', borderRadius:'50%', overflow:'hidden' }}>
                    {profile.avatar_url ? <img src={profile.avatar_url} alt="av" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : getInitials(profile.name || profile.username)}
                </div>
              </div>

              <p className="profile-bio">{profile.bio || 'Author on Inktrix.'}</p>

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
                {isOwnProfile ? (
                  <button className="btn-subscribe-main" onClick={() => navigate('/edit-profile')}>Edit Profile</button>
                ) : (
                  <>
                    <button className="btn-subscribe-main" onClick={handleSubscribe} style={{ background: subscribed ? '#444' : '#60c1fb' }}>{subscribed ? 'Subscribed ✓' : 'Subscribe'}</button>
                    <button className="btn-follow-main" onClick={handleFollow} style={{ background: followed ? '#1a3a1a' : '#262626', color: followed ? '#4caf50' : 'white' }}>{followed ? 'Following' : 'Follow'}</button>
                    <button className="btn-message-icon" onClick={openChat}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ width: '18px', height: '18px' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></button>
                  </>
                )}
              </div>
            </div>

            <div className="profile-tabs">
              {TABS.map(tab => (
                <div key={tab} className={`ptab-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
              ))}
            </div>

            <div className="profile-feed">
              {activeTab === 'Posts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {posts.length === 0 ? <p style={{ textAlign:'center', opacity:0.6, padding:40 }}>No stories yet.</p> : posts.map(a => <ArticleCard key={a.id} article={a} showToast={showToast} isDashboard={isOwnProfile} />)}
                </div>
              )}
              {activeTab === 'Activity' && (
                <div className="activity-feed">
                   {activity.length === 0 ? <p style={{ textAlign:'center', opacity:0.6, padding:40 }}>No activity.</p> : activity.map(item => (
                     <div key={item.id} className="activity-item" style={{ borderBottom: '1px solid #222', padding: '16px 0' }}>
                        <p style={{ color: 'var(--orange)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Commented</p>
                        <p style={{ color: 'white', fontSize: '0.95rem' }}>"{item.content}"</p>
                        {item.post_title && <p style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>On: {item.post_title}</p>}
                     </div>
                   ))}
                </div>
              )}
              {activeTab === 'Likes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                   {likedPosts.length === 0 ? <p style={{ textAlign:'center', opacity:0.6, padding:40 }}>No likes.</p> : likedPosts.map(a => <ArticleCard key={a.id} article={a} showToast={showToast} />)}
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

