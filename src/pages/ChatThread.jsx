import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { addUnread, clearUnread } from '../utils/unread';

const seedThreads = {
  '1': [
    { id: 1, from: 'them', text: 'Hey! Love the article on ChatGPT 🔥', time: '10:12 AM' },
    { id: 2, from: 'me', text: 'Thank you so much! Really glad it resonated.', time: '10:14 AM' },
    { id: 3, from: 'them', text: 'The part about dependency vs efficiency was eye-opening honestly', time: '10:15 AM' },
    { id: 4, from: 'me', text: 'Yeah that was the core insight for me too. Took me a while to realise I was just avoiding discomfort 😅', time: '10:17 AM' },
  ],
  '2': [
    { id: 1, from: 'them', text: 'Your design piece was incredibly refreshing.', time: '9:00 AM' },
    { id: 2, from: 'me', text: 'Thanks, I put a lot of thought into that one!', time: '9:05 AM' },
  ],
  '3': [
    { id: 1, from: 'them', text: 'The startup culture article was spot on 👌', time: '8:30 AM' },
  ],
};

export default function ChatThread({ showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const creator = location.state?.creator || {
    name: 'Creator',
    initials: 'C',
    color: '#e85d04',
    avatar: null,
  };

  const [messages, setMessages] = useState(seedThreads[id] || []);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  // Clear unread on entry
  useEffect(() => {
    clearUnread(id);
  }, [id]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const newMsg = {
      id: Date.now(),
      from: 'me',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, newMsg]);
    setInput('');

    // Simulate reply after a delay
    setTimeout(() => {
      const reply = {
        id: Date.now() + 1,
        from: 'them',
        text: '👍 Got it!',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, reply]);
      addUnread(id);
    }, 1500);
  };

  return (
    <div className="chat-page app-shell">
      <div className="chat-header">
        <button className="tb-circle-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div className="chat-header-info" onClick={() => navigate(`/profile/${encodeURIComponent(creator.name)}`, { state: { creator } })}>
          {creator.avatar
            ? <img src={creator.avatar} alt={creator.name} className="chat-header-avatar-img" />
            : <div className="chat-header-avatar-letter" style={{ background: creator.color }}>{creator.initials}</div>
          }
          <div>
            <div className="chat-header-name">{creator.name}</div>
            <div className="chat-header-sub">Tap to view profile</div>
          </div>
        </div>

        <button className="tb-circle-btn" onClick={() => showToast('Options')} title="Options">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>
      </div>

      <div className="chat-messages-area">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-bubble-row ${msg.from === 'me' ? 'mine' : 'theirs'}`}>
            {msg.from === 'them' && (
              creator.avatar
                ? <img src={creator.avatar} alt="" className="chat-bubble-avatar" />
                : <div className="chat-bubble-avatar-letter" style={{ background: creator.color }}>{(creator.initials || 'C')[0]}</div>
            )}
            <div className="chat-bubble-group">
              <div className={`chat-bubble ${msg.from === 'me' ? 'bubble-mine' : 'bubble-theirs'}`}>
                {msg.text}
              </div>
              <div className="chat-bubble-time">{msg.time}</div>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <input
          className="chat-text-input"
          placeholder={`Message ${(creator.name || 'Creator').split(' ')[0]}…`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button className="chat-send-btn" onClick={sendMessage} disabled={!input.trim()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
}
