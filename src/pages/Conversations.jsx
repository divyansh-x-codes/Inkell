import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToConversations,
  searchUsersByName,
  getConversationId,
  clearUserUnread
} from '../utils/firebaseData';

const getInitials = (name) => {
  if (!name) return 'U';
  const s = name.trim().split(' ');
  return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name[0].toUpperCase();
};

const avatarColors = ['#cc4400','#2b9348','#7046a0','#1a6fa8','#c0392b','#16a085'];
const colorForName = (name) => avatarColors[(name||'A').charCodeAt(0) % avatarColors.length];

export default function Conversations({ showToast }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [brokenImages, setBrokenImages] = useState({});

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeToConversations(user.uid, (data) => {
      setConversations(data);
      setLoading(false);
    });
    const safety = setTimeout(() => setLoading(false), 3000);
    return () => {
      unsubscribe();
      clearTimeout(safety);
    };
  }, [user]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        const results = await searchUsersByName(searchQuery);
        setUserResults(results.filter(u => u.uid !== user?.uid));
        setIsSearching(false);
      } else {
        setUserResults([]);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, user]);

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate();
      const diff = Date.now() - date.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'now';
      if (mins < 60) return `${mins}m`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h`;
      return `${Math.floor(hrs / 24)}d`;
    } catch { return ''; }
  };

  const handleImageError = (id) => {
    setBrokenImages(prev => ({ ...prev, [id]: true }));
  };

  const openThread = (conv, otherId, otherInfo) => {
    if (user?.uid) clearUserUnread(conv.id, user.uid);
    navigate(`/chat/${conv.id}`, {
      state: {
        recipientUserId: otherId,
        recipientName: otherInfo.name,
        recipientAvatar: otherInfo.avatar
      }
    });
  };

  const startNewChat = (recipient) => {
    const convoId = getConversationId(user.uid, recipient.uid);
    setSearchQuery('');
    navigate(`/chat/${convoId}`, {
      state: {
        recipientUserId: recipient.uid,
        recipientName: recipient.name,
        recipientAvatar: recipient.avatar
      }
    });
  };

  // Scroll logic for Topbar visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        if (isVisible) setIsVisible(false);
      } else {
        if (!isVisible) setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isVisible]);

  return (
    <div className="conv-page view active">
      <div className="app-shell">
        <div className={`chronicle-topbar premium ${!isVisible ? 'hidden' : ''}`}>
          <div className="topbar-left">
            <h1 className="nav-title">Messages</h1>
          </div>
          <div className="topbar-actions">
            <button className="tb-action-btn" onClick={() => navigate('/add-article')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ width: 22, height: 22 }}>
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
          </div>
        </div>

        <div className="conv-content-scroll">
          <div className="conv-search-container">
            <div className="conv-search-bar">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--gray)" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                placeholder="Search people or messages…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="conv-list-area">
            {!user ? (
              <div className="conv-empty-state">
                <div className="empty-icon">🔒</div>
                <h3>Please login to chat</h3>
                <button className="premium-action-btn" onClick={() => navigate('/login')}>Login</button>
              </div>
            ) : searchQuery.length > 1 ? (
              <div className="conv-search-results">
                <div className="section-label">People</div>
                {isSearching ? (
                  <div className="conv-list-status">Searching...</div>
                ) : userResults.length === 0 ? (
                  <div className="conv-list-status">No people found</div>
                ) : (
                  userResults.map(p => (
                    <div key={p.uid} className="conv-item premium-hover" onClick={() => startNewChat(p)}>
                      <div className="conv-avatar">
                        {(p.avatar || p.photoURL || p.profilePic) && !brokenImages[p.uid] ? (
                          <img src={p.avatar || p.photoURL || p.profilePic} alt="P" onError={() => handleImageError(p.uid)} />
                        ) : (
                          <div className="conv-initials" style={{ background: colorForName(p.name) }}>{getInitials(p.name)}</div>
                        )}
                      </div>
                      <div className="conv-text">
                        <div className="conv-row">
                          <span className="conv-name">{p.name || 'User'}</span>
                        </div>
                        <p className="conv-preview">Start a new conversation</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : loading ? (
              <div className="conv-list-status">Loading your chats...</div>
            ) : conversations.length === 0 ? (
              <div className="conv-empty-state">
                <div className="empty-icon">💬</div>
                <h3>No messages yet</h3>
                <p>Chat with your favorite authors and readers.</p>
                <button className="premium-action-btn" onClick={() => navigate('/search')}>Browse Authors</button>
              </div>
            ) : (
              conversations.map(conv => {
                const otherId = conv.participants.find(id => id !== user.uid);
                const otherInfo = conv.participantInfo?.[otherId] || { name: 'User', avatar: null };
                const myUnread = conv.unreadCount?.[user.uid] || 0;
                const isBroken = brokenImages[conv.id];

                return (
                  <div key={conv.id} className="conv-item premium-hover" onClick={() => openThread(conv, otherId, otherInfo)}>
                    <div className="conv-avatar">
                      {(otherInfo.avatar || otherInfo.photoURL || otherInfo.profilePic) && !isBroken ? (
                        <img src={otherInfo.avatar || otherInfo.photoURL || otherInfo.profilePic} alt="A" onError={() => handleImageError(conv.id)} />
                      ) : (
                        <div className="conv-initials" style={{ background: colorForName(otherInfo.name) }}>{getInitials(otherInfo.name)}</div>
                      )}
                      {myUnread > 0 && <div className="unread-dot"></div>}
                    </div>
                    <div className="conv-text">
                      <div className="conv-row">
                        <span className="conv-name" style={{ fontWeight: myUnread > 0 ? 700 : 600 }}>{otherInfo.name}</span>
                        <span className="conv-time">{getTimeAgo(conv.lastMessageTime)}</span>
                      </div>
                      <div className="conv-preview-row">
                        <p className="conv-preview" style={{ color: myUnread > 0 ? 'var(--white)' : 'var(--gray)' }}>
                          {conv.lastSenderId === user.uid ? `You: ${conv.lastMessage}` : conv.lastMessage}
                        </p>
                        {myUnread > 0 && <div className="unread-count">{myUnread > 9 ? '9+' : myUnread}</div>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <BottomNav showToast={showToast} currentPath="/conversations" />
      </div>
    </div>
  );
}
