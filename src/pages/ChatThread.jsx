import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToMessages, sendMessage, getUserProfile, clearUserUnread } from '../utils/firebaseData';

export default function ChatThread({ showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { id } = useParams(); // conversationId

  const [recipient, setRecipient] = useState(location.state?.recipientUserId ? {
    id: location.state.recipientUserId,
    name: location.state.recipientName || 'User',
    avatar: location.state.recipientAvatar || null,
  } : null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [brokenImages, setBrokenImages] = useState({});

  useEffect(() => {
    if (!recipient && id && user) {
      const parts = id.split('_');
      const otherUid = parts.find(p => p !== user.uid);
      if (otherUid) {
        getUserProfile(otherUid).then(prof => {
          if (prof) {
            setRecipient({
              id: prof.uid || prof.id,
              name: prof.name,
              avatar: prof.avatar || prof.photoURL || prof.profilePic
            });
          }
        });
      }
    }
  }, [id, user, recipient]);

  useEffect(() => {
    if (!id || !user?.uid) return;
    clearUserUnread(id, user.uid);
    const unsubscribe = subscribeToMessages(id, (data) => {
      setMessages(data);
      setLoading(false);
      clearUserUnread(id, user.uid);
    });
    return () => unsubscribe();
  }, [id, user?.uid]);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !user || !recipient) return;
    setInput('');
    const result = await sendMessage(id, user, text, recipient);
    if (result.error) showToast('Failed to send message');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const s = name.trim().split(' ');
    return s.length > 1 ? (s[0][0] + (s[1][0] || '')).toUpperCase() : name[0].toUpperCase();
  };

  const handleImageError = (key) => setBrokenImages(prev => ({ ...prev, [key]: true }));

  const avatarColors = ['#cc4400','#2b9348','#7046a0','#1a6fa8','#c0392b','#16a085'];
  const colorForName = (name) => avatarColors[(name||'A').charCodeAt(0) % avatarColors.length];

  if (!user) return <div className="chat-empty-status">Login to chat</div>;
  
  const displayName = recipient?.name || 'Chat';
  const recipientAvatar = recipient?.avatar || recipient?.photoURL || recipient?.profilePic;

  return (
    <div className="chat-page view active">
      <div className="app-shell">
        <div className="chat-header">
          <button className="tb-action-btn" onClick={() => navigate(-1)} style={{ marginRight: 4 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ width: 22, height: 22 }}>
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <div className="chat-header-info" onClick={() => navigate(`/profile/${encodeURIComponent(displayName)}`, { state: { authorId: recipient?.id } })}>
            {recipientAvatar && !brokenImages['header']
              ? <img src={recipientAvatar} alt="DP" className="chat-header-avatar-img" onError={() => handleImageError('header')} />
              : <div className="chat-header-avatar-letter" style={{ background: colorForName(displayName) }}>{getInitials(displayName)}</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="chat-header-name">{displayName}</div>
              <div className="chat-header-sub">Online now</div>
            </div>
          </div>

          <button className="tb-action-btn" onClick={() => showToast('Options')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ width: 22, height: 22 }}>
              <circle cx="12" cy="12" r="1.5"></circle>
              <circle cx="12" cy="5" r="1.5"></circle>
              <circle cx="12" cy="19" r="1.5"></circle>
            </svg>
          </button>
        </div>

        <div className="chat-messages-area">
          {messages.length === 0 && !loading && (
            <div className="chat-welcome-box">
              <div className="welcome-chat-icon">👋</div>
              <h3>Say hello to {displayName.split(' ')[0]}</h3>
              <p>Start a premium conversation on Inkwell.</p>
            </div>
          )}
          {messages.map((msg, idx) => {
            const isMine = msg.senderId === user.uid;
            const bubbleKey = `bubble-${msg.id || idx}`;
            return (
              <div key={msg.id} className={`chat-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                {!isMine && (
                  recipientAvatar && !brokenImages[bubbleKey]
                    ? <img src={recipientAvatar} alt="" className="chat-bubble-avatar" onError={() => handleImageError(bubbleKey)} />
                    : <div className="chat-bubble-avatar-letter" style={{ background: colorForName(displayName) }}>{getInitials(displayName)[0]}</div>
                )}
                <div className="chat-bubble-group">
                  <div className={`chat-bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}>
                    {msg.text}
                  </div>
                  <div className="chat-bubble-time">
                    {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} style={{ height: 1 }} />
        </div>

        <div className="chat-input-bar">
          <input
            className="chat-text-input"
            placeholder={`Message ${displayName.split(' ')[0]}…`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button className="chat-send-btn" onClick={handleSend} disabled={!input.trim()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 18, height: 18, marginLeft: 2 }}>
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
