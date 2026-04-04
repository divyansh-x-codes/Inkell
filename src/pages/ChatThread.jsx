import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToMessages, sendMessage, getConversationId } from '../utils/firebaseData';

export default function ChatThread({ showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { id } = useParams(); // This is the conversationId

  // Recipient info passed via state or fallback
  const recipient = location.state?.recipientUserId ? {
    id: location.state.recipientUserId,
    name: location.state.recipientName || 'User',
    avatar: location.state.recipientAvatar || null,
  } : null;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const [loading, setLoading] = useState(true);

  // Real-time subscription
  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeToMessages(id, (data) => {
      setMessages(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !user || !recipient) return;

    setInput('');
    const result = await sendMessage(id, user, text, recipient);
    if (result.error) {
      showToast('Failed to send message');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const s = name.trim().split(' ');
    return s.length > 1 ? (s[0][0] + s[1][0]).toUpperCase() : name[0].toUpperCase();
  };

  const avatarColors = ['#cc4400','#2b9348','#7046a0','#1a6fa8','#c0392b','#16a085'];
  const colorForName = (name) => avatarColors[(name||'A').charCodeAt(0) % avatarColors.length];

  if (!user) return <div style={{padding: 40, textAlign: 'center', color: 'white'}}>Login to chat</div>;
  if (!recipient && loading) return <div style={{padding: 40, textAlign: 'center', color: 'white'}}>Loading chat...</div>;

  const displayName = recipient?.name || 'Chat';

  return (
    <div className="chat-page app-shell">
      <div className="chat-header">
        <button className="tb-circle-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div className="chat-header-info" onClick={() => navigate(`/profile/${encodeURIComponent(displayName)}`)}>
          {recipient?.avatar
            ? <img src={recipient.avatar} alt={displayName} className="chat-header-avatar-img" />
            : <div className="chat-header-avatar-letter" style={{ background: colorForName(displayName) }}>{getInitials(displayName)}</div>
          }
          <div>
            <div className="chat-header-name">{displayName}</div>
            <div className="chat-header-sub">Online now</div>
          </div>
        </div>

        <button className="tb-circle-btn" onClick={() => showToast('Chat options')} title="Options">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>
      </div>

      <div className="chat-messages-area">
        {messages.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#444', fontSize: '0.9rem' }}>
            No messages yet. Say hello! 👋
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`chat-bubble-row ${msg.senderId === user.uid ? 'mine' : 'theirs'}`}>
            {msg.senderId !== user.uid && (
              recipient?.avatar
                ? <img src={recipient.avatar} alt="" className="chat-bubble-avatar" />
                : <div className="chat-bubble-avatar-letter" style={{ background: colorForName(displayName) }}>{getInitials(displayName)[0]}</div>
            )}
            <div className="chat-bubble-group">
              <div className={`chat-bubble ${msg.senderId === user.uid ? 'bubble-mine' : 'bubble-theirs'}`}>
                {msg.text}
              </div>
              <div className="chat-bubble-time">
                {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
              </div>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
}
