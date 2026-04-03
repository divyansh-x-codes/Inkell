import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { getUnreadForThread } from '../utils/unread';

const mockConversations = [
  // ... (keeping the same data but will dynamically check unread)
  {
    id: 1,
    name: 'Divyansh Codespace',
    handle: '@divyansh',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=80&auto=format&fit=crop',
    lastMsg: 'Hey! Love the article on ChatGPT 🔥',
    time: '2m',
    initials: 'DC',
    color: '#cc4400',
  },
  {
    id: 2,
    name: 'Youssef Hosni',
    handle: '@youssefhosni95',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=80&auto=format&fit=crop',
    lastMsg: 'Thanks for subscribing! Any questions?',
    time: '1h',
    initials: 'YH',
    color: '#2b9348',
  },
  {
    id: 3,
    name: 'Sarah Chen',
    handle: '@sarahwrites',
    avatar: null,
    lastMsg: 'The new piece on design systems is live!',
    time: '3h',
    initials: 'SC',
    color: '#7046a0',
  },
  {
    id: 4,
    name: 'Julian Cole',
    handle: '@juliancole',
    avatar: null,
    lastMsg: 'Loved your comment on the article.',
    time: '1d',
    initials: 'JC',
    color: '#1a6fa8',
  },
];

export default function Conversations({ showToast }) {
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setRefresh(prev => prev + 1);
    window.addEventListener('inkwell_unread_changed', handleUpdate);
    return () => window.removeEventListener('inkwell_unread_changed', handleUpdate);
  }, []);

  return (
    <div className="conv-page app-shell">
      <div className="conv-header">
        <h1 className="conv-title">Messages</h1>
        <button className="tb-circle-btn" onClick={() => showToast('New message')}>
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
        <input className="conv-search-input" placeholder="Search messages…" />
      </div>

      <div className="conv-list">
        {mockConversations.map(conv => (
          <div
            key={conv.id}
            className="conv-item"
            onClick={() => navigate(`/chat/${conv.id}`, { state: { creator: conv } })}
          >
            <div className="conv-avatar-wrap">
              {conv.avatar
                ? <img src={conv.avatar} alt={conv.name} className="conv-avatar-img" />
                : <div className="conv-avatar-letter" style={{ background: conv.color }}>{conv.initials}</div>
              }
              {getUnreadForThread(conv.id) > 0 && <span className="conv-unread-dot">{getUnreadForThread(conv.id)}</span>}
            </div>
            <div className="conv-content">
              <div className="conv-top-row">
                <span className="conv-name">{conv.name}</span>
                <span className="conv-time">{conv.time}</span>
              </div>
              <p className={`conv-preview ${getUnreadForThread(conv.id) > 0 ? 'unread' : ''}`}>{conv.lastMsg}</p>
            </div>
          </div>
        ))}
      </div>

      <BottomNav showToast={showToast} />
    </div>
  );
}
