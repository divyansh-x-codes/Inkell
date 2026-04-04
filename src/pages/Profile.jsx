import { useNavigate, useParams, useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import ArticleCard from '../components/ArticleCard';
import { articles } from '../data';
import SubscribeModal from '../components/SubscribeModal';
import { useAuth } from '../context/AuthContext';
import { getConversationId } from '../utils/firebaseData';

// Per-creator data keyed by username slug
const CREATOR_DB = {
  default: {
    name: 'Divyansh Codespace',
    handle: '@divyansh',
    verified: true,
    bio: 'Writer on productivity, tech & the human side of software. Building in public.',
    linksCount: '+3',
    subscribers: '4.8K+ subscribers',
    avatar: null,
    color: '#cc4400',
    posts: articles.slice(0, 2),
    likes: articles.slice(1, 3),
    reads: articles.slice(2, 4),
  },
  'Youssef Hosni': {
    name: 'Youssef Hosni',
    handle: '@youssefhosni95',
    verified: true,
    bio: 'AI Engineer/ Applied Scientist @ Greenstep | PhD & Generative AI Researcher @ Aalto University | Founder @ To Data & Beyond',
    linksCount: '+7',
    subscribers: '22K+ subscribers',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop',
    color: '#2b9348',
    posts: articles.slice(0, 2),
    likes: articles.slice(1, 3),
    reads: articles.slice(0, 3),
  },
  'Julian Cole': {
    name: 'Julian Cole',
    handle: '@juliancole',
    verified: false,
    bio: 'Strategy & design practitioner. Writing about creativity, frameworks, and building great things.',
    linksCount: '+2',
    subscribers: '11K+ subscribers',
    avatar: null,
    color: '#1a6fa8',
    posts: articles.slice(1, 3),
    likes: articles.slice(0, 2),
    reads: articles.slice(1, 4),
  },
};

const VerifiedIcon = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#f4622a" strokeWidth="2" style={{ width: size, height: size }}>
    <polygon points="12 2 15.09 5.09 19.54 4.46 20.18 8.91 23.27 12 20.18 15.09 19.54 19.54 15.09 18.91 12 22 8.91 18.91 4.46 19.54 3.82 15.09 0.73 12 3.82 8.91 4.46 4.46 8.91 5.09" fill="#1a0000" />
    <polyline points="9 12 11 14 15 10" stroke="#f4622a" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const getInitials = (name) => {
  if (!name) return 'A';
  const s = name.split(' ');
  return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name[0].toUpperCase();
};

export default function Profile({ showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { username } = useParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('Activity');
  const [subscribed, setSubscribed] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  // Resolve creator by decoded username or fall back
  const decoded = decodeURIComponent(username || '');
  const creator = CREATOR_DB[decoded] || { ...CREATOR_DB.default, name: decoded || 'Creator', handle: `@${decoded?.toLowerCase().replace(/\s/g, '')}` };

  const creatorChatState = {
    id: 1,
    name: creator.name,
    handle: creator.handle,
    avatar: creator.avatar,
    initials: getInitials(creator.name),
    color: creator.color,
  };

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
    showToast(`You'll be notified when ${creator.name}'s newsletter launches!`);
  };

  const handleFollow = () => {
    setFollowed(!followed);
    showToast(followed ? 'Unfollowed' : `Following ${creator.name}`);
  };

  const openChat = () => {
    if (!user) {
      showToast('Login to message authors');
      navigate('/login');
      return;
    }
    const targetUserId = location.state?.authorId;
    if (!targetUserId) {
      showToast('Unable to start chat with this creator');
      return;
    }
    if (targetUserId === user.uid) {
      showToast("Cannot chat with yourself!");
      return;
    }
    const convoId = getConversationId(user.uid, targetUserId);
    navigate(`/chat/${convoId}`, { 
      state: { 
        recipientUserId: targetUserId,
        recipientName: creator.name,
        recipientAvatar: creator.avatar
      } 
    });
  };

  const TABS = ['Activity', 'Posts', 'Chat', 'Likes', 'Reads (30)'];

  return (
    <div className="profile-page app-shell">
      {showSubModal && (
        <SubscribeModal
          author={creator.name}
          onClose={() => setShowSubModal(false)}
          onConfirm={confirmSubscribe}
        />
      )}

      {/* Top bar */}
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
          <button className="tb-circle-btn" onClick={() => showToast('Options')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </button>
        </div>
      </div>

      <div className="profile-scroll-area">

        {/* Creator header */}
        <div className="profile-header-main">
          <div className="profile-title-row">
            <div className="profile-info">
              <h1 className="profile-name-header">
                {creator.name}
                {creator.verified && (
                  <span style={{ marginLeft: 8, display: 'inline-flex', verticalAlign: 'middle' }}>
                    <VerifiedIcon size={22} />
                  </span>
                )}
              </h1>
              <p className="profile-handle">{creator.handle}</p>
            </div>
            {creator.avatar
              ? <img src={creator.avatar} alt={creator.name} className="profile-avatar-large" />
              : (
                <div style={{
                  width: 90, height: 90, borderRadius: '50%', flexShrink: 0,
                  background: creator.color, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 800, fontSize: '2rem',
                  color: 'white', marginLeft: 16, fontFamily: "'DM Sans',sans-serif",
                }}>
                  {getInitials(creator.name)}
                </div>
              )
            }
          </div>

          <p className="profile-bio">{creator.bio}</p>

          <div className="profile-link-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            {creator.linksCount}
          </div>

          <p className="profile-subs-count">{creator.subscribers}</p>

          <div className="profile-action-buttons">
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
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
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

        {/* Tab content */}
        <div className="profile-feed">

          {/* Activity */}
          {activeTab === 'Activity' && (
            <div className="profile-post">
              <div className="ppost-header">
                <div className="ppost-author">
                  {creator.avatar
                    ? <img src={creator.avatar} alt="Author" className="ppost-avatar" />
                    : <div className="ppost-avatar" style={{ background: creator.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>{getInitials(creator.name)}</div>
                  }
                  <div>
                    <div className="ppost-name-row">
                      <span className="ppost-name">{creator.name}</span>
                      {creator.verified && <VerifiedIcon size={15} />}
                    </div>
                    <div className="ppost-meta">
                      1d <span style={{ margin: '0 4px', color: '#555' }}>•</span>
                      <span style={{ color: '#60c1fb', cursor: 'pointer' }} onClick={handleSubscribe}>
                        {subscribed ? 'Subscribed' : 'Subscribe'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ppost-brand-icon">
                  <span style={{ color: '#f4622a', fontWeight: 800 }}>#</span>&nbsp;inkwell
                </div>
              </div>

              <h3 className="ppost-title">
                {creator.posts?.[0]?.title || 'Latest from this creator'}
              </h3>

              {creator.posts?.[0]?.coverImage && (
                <div className="ppost-img-wrap">
                  <img src={creator.posts[0].coverImage} className="ppost-img" alt="Post cover" />
                </div>
              )}

              <div className="card-bottom-actions" style={{ marginTop: '16px' }}>
                <div className="actions-left" style={{ gap: '16px' }}>
                  <button className="action-btn" onClick={() => showToast('Liked!')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px' }}>
                      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.8 1.1-1.1a5.5 5.5 0 0 0 0-7.8z"></path>
                    </svg>
                    <span style={{ fontSize: '0.9rem' }}>1.2k</span>
                  </button>
                  <button className="action-btn" onClick={() => navigate(`/comments/${creator.posts?.[0]?.id || 0}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path>
                    </svg>
                    <span style={{ fontSize: '0.9rem' }}>84</span>
                  </button>
                  <button className="action-btn" onClick={() => showToast('Reposted!')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px' }}>
                      <polyline points="17 1 21 5 17 9"></polyline>
                      <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                      <polyline points="7 23 3 19 7 15"></polyline>
                      <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                    </svg>
                  </button>
                </div>
                <button className="action-btn" onClick={() => showToast('Link copied!')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px' }}>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"></path>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Posts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {(creator.posts || articles.slice(0, 2)).map(a => (
                <ArticleCard key={a.id} article={a} showToast={showToast} />
              ))}
            </div>
          )}

          {activeTab === 'Likes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {(creator.likes || articles.slice(1, 3)).map(a => (
                <ArticleCard key={a.id} article={a} showToast={showToast} />
              ))}
            </div>
          )}

          {activeTab === 'Reads (30)' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {(creator.reads || articles.slice(0, 3)).map(a => (
                <ArticleCard key={a.id} article={a} showToast={showToast} />
              ))}
            </div>
          )}

          {activeTab === 'Chat' && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>💬</div>
              <div style={{ color: 'var(--white)', fontWeight: 600, marginBottom: 8, fontSize: '1rem' }}>
                Start a conversation
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: 24 }}>
                Send {creator.name.split(' ')[0]} a direct message
              </div>
              <button
                onClick={openChat}
                style={{
                  background: '#e85d04', color: 'white', border: 'none',
                  borderRadius: 12, padding: '12px 28px', fontSize: '1rem',
                  fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer'
                }}
              >
                Send Message
              </button>
            </div>
          )}

        </div>
      </div>

      <BottomNav showToast={showToast} />
    </div>
  );
}
