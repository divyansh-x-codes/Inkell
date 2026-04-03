import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { addUnread, clearUnread } from '../utils/unread';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const seedThreads = {
  '1': [
    { id: 1, from: 'them', text: 'Hey! Love the article on ChatGPT 🔥', time: '10:12 AM' },
    { id: 2, from: 'me', text: 'Thank you so much! Really glad it resonated.', time: '10:14 AM' },
    { id: 3, from: 'them', text: 'The part about dependency vs efficiency was eye-opening honestly', time: '10:15 AM' },
    { id: 4, from: 'me', text: 'Yeah that was the core insight for me too. Took me a while to realise I was just avoiding discomfort 😅', time: '10:17 AM' },
  ],
};

export default function ChatThread({ showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user } = useAuth();

  const creator = location.state?.creator || {
    name: 'Creator',
    initials: 'C',
    color: '#e85d04',
    avatar: null,
  };

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  // Clear unread on entry
  useEffect(() => {
    clearUnread(id);
  }, [id]);

  // Load messages from Supabase
  useEffect(() => {
    async function loadMessages() {
      // For now, if ID is numeric (mock), we use seed data. 
      // In a real app, 'id' would be a UUID from our 'conversations' table.
      if (!id.includes('-') && seedThreads[id]) {
        setMessages(seedThreads[id]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
      } else {
        setMessages(data.map(m => ({
          id: m.id,
          from: m.sender_id === user?.id ? 'me' : 'them',
          text: m.content,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
      }
      setLoading(false);
    }

    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat_${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, 
      (payload) => {
        const m = payload.new;
        if (m.sender_id !== user?.id) {
          setMessages(prev => [...prev, {
            id: m.id,
            from: 'them',
            text: m.content,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
          addUnread(id);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id, user]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !user) return;

    // Optimistic update
    const tempId = Date.now();
    const newMsgLocal = {
      id: tempId,
      from: 'me',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, newMsgLocal]);
    setInput('');

    // If it's a mock ID, we don't save to Supabase (user should create real conversations)
    if (!id.includes('-')) {
      showToast('Live chat requires a real Supabase conversation ID');
      return;
    }

    const { error } = await supabase
      .from('messages')
      .insert([
        { conversation_id: id, sender_id: user.id, content: text }
      ]);

    if (error) {
      showToast(error.message);
      // Remove optimistic message if error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  if (loading) return <div style={{padding:'20px', color:'white'}}>Loading chat...</div>;

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

        {typing && (
          <div className="chat-bubble-row theirs">
            {creator.avatar
              ? <img src={creator.avatar} alt="" className="chat-bubble-avatar" />
              : <div className="chat-bubble-avatar-letter" style={{ background: creator.color }}>{(creator.initials || 'C')[0]}</div>
            }
            <div className="chat-bubble-group">
              <div className="chat-bubble bubble-theirs typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <input
          className="chat-text-input"
          placeholder={user ? `Message ${(creator.name || 'Creator').split(' ')[0]}…` : "Log in to chat..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          disabled={!user}
        />
        <button className="chat-send-btn" onClick={sendMessage} disabled={!input.trim() || !user}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
}
