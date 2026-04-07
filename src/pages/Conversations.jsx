import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import {
  subscribeToConversations,
  getOrCreateConversation
} from '../utils/supabaseData';

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
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToConversations(user.id, (data) => {
      setConversations(data);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .or(`name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
          .neq('id', user?.id)
          .limit(10);
        setUserResults(data || []);
        setIsSearching(false);
      } else {
        setUserResults([]);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, user?.id]);

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const handleImageError = (id) => {
    setBrokenImages(prev => ({ ...prev, [id]: true }));
  };

  const openThread = (conv) => {
    navigate(`/chat/${conv.id}`, {
      state: {
        recipientUserId: conv.otherParticipant.id,
        recipientName: conv.otherParticipant.name || conv.otherParticipant.username,
        recipientAvatar: conv.otherParticipant.avatar_url
      }
    });
  };

  const startNewChat = async (recipient) => {
    const convoId = await getOrCreateConversation(user.id, recipient.id);
    if (!convoId) {
      showToast('Failed to start chat');
      return;
    }
    setSearchQuery('');
    navigate(`/chat/${convoId}`, {
      state: {
        recipientUserId: recipient.id,
        recipientName: recipient.name || recipient.username,
        recipientAvatar: recipient.avatar_url
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
        </div>

        <div className="conv-content-scroll">
          <div className="conv-search-container">
            <div className="conv-search-bar">
               <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, marginRight: '8px' }} fill="var(--gray)"><path d="M21.414,18.586l-2.801-2.801C19.487,14.398,20,12.76,20,11c0-4.971-4.029-9-9-9s-9,4.029-9,9c0,4.971,4.029,9,9,9c1.761,0,3.398-0.513,4.785-1.387l2.801,2.801c0.781,0.781,2.047,0.781,2.828,0C22.195,20.633,22.195,19.367,21.414,18.586z M11,16 c-2.761,0-5-2.239-5-5s2.239-5,5-5s5,2.239,5,5S13.761,16,11,16z"/></svg>
              <input
                placeholder="Search people…"
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
                <button className="btn-primary" onClick={() => navigate('/login')}>Login</button>
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
                    <div key={p.id} className="conv-item premium-hover" onClick={() => startNewChat(p)}>
                      <div className="conv-avatar">
                        {p.avatar_url && !brokenImages[p.id] ? (
                          <img src={p.avatar_url} alt="P" onError={() => handleImageError(p.id)} />
                        ) : (
                          <div className="conv-initials" style={{ background: colorForName(p.name || p.username) }}>{getInitials(p.name || p.username)}</div>
                        )}
                      </div>
                      <div className="conv-text">
                        <div className="conv-row">
                          <span className="conv-name">{p.name || p.username || 'User'}</span>
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
                <button className="btn-primary" onClick={() => navigate('/search')}>Browse Authors</button>
              </div>
            ) : (
              conversations.map(conv => {
                const otherParticipant = conv.otherParticipant;
                const isBroken = brokenImages[conv.id];

                return (
                  <div key={conv.id} className="conv-item premium-hover" onClick={() => openThread(conv)}>
                    <div className="conv-avatar">
                      {otherParticipant.avatar_url && !isBroken ? (
                        <img src={otherParticipant.avatar_url} alt="A" onError={() => handleImageError(conv.id)} />
                      ) : (
                        <div className="conv-initials" style={{ background: colorForName(otherParticipant.name || otherParticipant.username) }}>{getInitials(otherParticipant.name || otherParticipant.username)}</div>
                      )}
                    </div>
                    <div className="conv-text">
                      <div className="conv-row">
                        <span className="conv-name">{otherParticipant.name || otherParticipant.username}</span>
                        <span className="conv-time">{getTimeAgo(conv.lastMessageAt)}</span>
                      </div>
                      <div className="conv-preview-row">
                        <p className="conv-preview">
                          {conv.lastSenderId === user.id ? `You: ${conv.lastMessage}` : conv.lastMessage}
                        </p>
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

