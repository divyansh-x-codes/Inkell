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
            <h1 className="nav-title">Inktrix Messages</h1>
          </div>
          <div className="topbar-actions">
          </div>
        </div>

        <div className="conv-content-scroll">
          <div className="conv-search-container">
            <div className="conv-search-bar">
              <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, marginRight: '8px' }}>
                <linearGradient id="hBcdOHj0tpNmQcPjQ7iiFa" x1="4.696" x2="21.274" y1="4.696" y2="21.274" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/></linearGradient><path fill="url(#hBcdOHj0tpNmQcPjQ7iiFa)" d="M21.414,18.586c-0.287-0.287-1.942-1.942-2.801-2.801l0,0C19.487,14.398,20,12.76,20,11 c0-4.971-4.029-9-9-9s-9,4.029-9,9c0,4.971,4.029,9,9,9c1.761,0,3.398-0.513,4.785-1.387c0,0,0,0,0,0 c0.859,0.859,2.514,2.514,2.801,2.801c0.781,0.781,2.047,0.781,2.828,0C22.195,20.633,22.195,19.367,21.414,18.586z M11,16 c-2.761,0-5-2.239-5-5s2.239-5,5-5s5,2.239,5,5S13.761,16,11,16z"/><g><linearGradient id="hBcdOHj0tpNmQcPjQ7iiFb" x1="4.636" x2="21.414" y1="4.636" y2="21.414" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".493" stop-color="#fff" stop-opacity="0"/><stop offset=".997" stop-color="#fff" stop-opacity=".3"/></linearGradient><path fill="url(#hBcdOHj0tpNmQcPjQ7iiFb)" d="M11,2.5c4.687,0,8.5,3.813,8.5,8.5 c0,1.595-0.453,3.158-1.31,4.518l-0.213,0.338l0.282,0.282l2.801,2.801C21.344,19.223,21.5,19.599,21.5,20 c0,0.401-0.156,0.777-0.439,1.061C20.777,21.344,20.401,21.5,20,21.5s-0.777-0.156-1.061-0.439l-2.801-2.801l-0.282-0.282 l-0.338,0.213C14.158,19.047,12.595,19.5,11,19.5c-4.687,0-8.5-3.813-8.5-8.5S6.313,2.5,11,2.5 M11,16.5 c3.033,0,5.5-2.467,5.5-5.5S14.033,5.5,11,5.5S5.5,7.967,5.5,11S7.967,16.5,11,16.5 M11,2c-4.971,0-9,4.029-9,9 c0,4.971,4.029,9,9,9c1.761,0,3.398-0.513,4.785-1.387c0,0,0,0,0,0c0,0,0,0,0,0c0,0,0,0,0,0c0.859,0.859,2.514,2.514,2.801,2.801 C18.976,21.805,19.488,22,20,22c0.512,0,1.024-0.195,1.414-0.586c0.781-0.781,0.781-2.047,0-2.828 c-0.287-0.287-1.942-1.942-2.801-2.801C19.487,14.398,20,12.76,20,11C20,6.029,15.971,2,11,2L11,2z M11,16c-2.761,0-5-2.239-5-5 c0-2.761,2.239-5,5-5c2.761,0,5,2.239,5,5C16,13.761,13.761,16,11,16L11,16z"/></g>
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
