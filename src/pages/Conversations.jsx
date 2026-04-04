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

  // 1. Subscribe to existing conversations
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeToConversations(user.uid, (data) => {
      setConversations(data);
      setLoading(false);
    });
    // Add a small safety timeout to clear loading if Firestore hangs
    const safety = setTimeout(() => setLoading(false), 3000);

    return () => {
      unsubscribe();
      clearTimeout(safety);
    };
  }, [user]);

  // 2. Handle user search for starting NEW chats
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        const results = await searchUsersByName(searchQuery);
        // Exclude the current user from search
        setUserResults(results.filter(u => u.uid !== user?.uid));
        setIsSearching(false);
      } else {
        setUserResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, user]);

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '...';
    try {
      const date = timestamp.toDate();
      const diff = Date.now() - date.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'now';
      if (mins < 60) return `${mins}m`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h`;
      return `${Math.floor(hrs / 24)}d`;
    } catch { return '...'; }
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

  const openThread = (conv, otherId, otherInfo) => {
    // Clear server-side unread count when entering thread
    if (user?.uid) clearUserUnread(conv.id, user.uid);
    navigate(`/chat/${conv.id}`, {
      state: {
        recipientUserId: otherId,
        recipientName: otherInfo.name,
        recipientAvatar: otherInfo.avatar
      }
    });
  };

  return (
    <div className="conv-page app-shell">
      <div className="conv-header">
        <h1 className="conv-title">Messages</h1>
        <button className="tb-circle-btn" onClick={() => navigate('/search')} title="Find Creators">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
      </div>

      <div className="conv-search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          className="conv-search-input"
          placeholder="Search people or messages…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="conv-list">
        {!user ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: '#555' }}>
            <div style={{ fontSize: '2rem', marginBottom: 16 }}>🔒</div>
            <div style={{ fontWeight: 600, color: 'white', marginBottom: 8 }}>Please Login</div>
            <p style={{ fontSize: '0.85rem' }}>Login to see your real-time private messages.</p>
            <button className="saved-browse-btn" style={{ marginTop: 20 }} onClick={() => navigate('/login')}>Log in</button>
          </div>
        ) : searchQuery.length > 1 ? (
          <div className="new-chat-results">
            <div className="search-section-label">People</div>
            {isSearching ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'gray' }}>Searching...</div>
            ) : userResults.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'gray' }}>No people found</div>
            ) : (
              userResults.map(p => (
                <div key={p.uid} className="conv-item animate-in" onClick={() => startNewChat(p)}>
                  <div className="conv-avatar-wrap">
                    {p.avatar
                      ? <img src={p.avatar} alt={p.name} className="conv-avatar-img" />
                      : <div className="conv-avatar-letter" style={{ background: colorForName(p.name) }}>{getInitials(p.name)}</div>
                    }
                  </div>
                  <div className="conv-content">
                    <div className="conv-name">{p.name}</div>
                    <p className="conv-preview">Click to send a message</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#555' }}>🔄 Loading chats...</div>
        ) : conversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#555' }}>
             <div style={{ fontSize: '2rem', marginBottom: 16 }}>💬</div>
             <div style={{ fontWeight: 600, color: 'white', marginBottom: 8 }}>No messages yet</div>
             <p style={{ fontSize: '0.85rem' }}>Find a creator to start a conversation.</p>
             <button className="saved-browse-btn" style={{ marginTop: 20 }} onClick={() => navigate('/search')}>Browse Authors</button>
          </div>
        ) : (
          conversations.map(conv => {
            const otherId = conv.participants.find(id => id !== user.uid);
            const otherInfo = conv.participantInfo?.[otherId] || { name: 'User', avatar: null };
            const myUnread = conv.unreadCount?.[user.uid] || 0;

            return (
              <div
                key={conv.id}
                className="conv-item"
                onClick={() => openThread(conv, otherId, otherInfo)}
              >
                <div className="conv-avatar-wrap">
                  {otherInfo.avatar
                    ? <img src={otherInfo.avatar} alt={otherInfo.name} className="conv-avatar-img" />
                    : <div className="conv-avatar-letter" style={{ background: colorForName(otherInfo.name) }}>{getInitials(otherInfo.name)}</div>
                  }
                </div>
                <div className="conv-content">
                  <div className="conv-top-row">
                    <span className="conv-name" style={{ fontWeight: myUnread > 0 ? 700 : 500 }}>{otherInfo.name}</span>
                    <span className="conv-time">{getTimeAgo(conv.lastMessageTime)}</span>
                  </div>
                  <p className="conv-preview" style={{
                    color: myUnread > 0 ? 'var(--white)' : (conv.lastSenderId !== user.uid ? 'var(--white)' : 'var(--gray)'),
                    fontWeight: myUnread > 0 ? 600 : 400
                  }}>
                    {conv.lastSenderId === user.uid ? `You: ${conv.lastMessage}` : conv.lastMessage}
                  </p>
                </div>
                {myUnread > 0 && (
                  <div style={{
                    minWidth: 20, height: 20, borderRadius: 10,
                    background: '#e85d04', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 800, flexShrink: 0,
                    fontFamily: "'DM Sans', sans-serif",
                    padding: '0 5px',
                  }}>
                    {myUnread > 9 ? '9+' : myUnread}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNav showToast={showToast} />
    </div>
  );
}
